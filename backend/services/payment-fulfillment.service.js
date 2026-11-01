import { pool } from '../src/database/database.js';
import { provisionHotspotAccess, revokeHotspotAccess } from './mikrotik.service.js';

export class PaymentFlowError extends Error {
    constructor(message, status = 409) { super(message); this.status = status; }
}
// Lock the payment before changing it. Cash and provider verification share this path.
export async function fulfillPayment({ companyId, reference, source, providerReference, adminId, durationMinutes }, db = pool) {
    if (!['cash','selcom'].includes(source)) throw new PaymentFlowError('Invalid verification source',400);
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const { rows: [payment] } = await client.query(`SELECT pay.*, COALESCE(pay.purchased_duration_minutes,p.duration_minutes) AS duration_minutes
            FROM payments pay JOIN packages p ON p.id=pay.package_id AND p.company_id=pay.company_id
            JOIN companies c ON c.id=pay.company_id AND c.status='active'
            WHERE pay.company_id=$1 AND pay.transaction_reference=$2 FOR UPDATE OF pay`, [companyId, reference]);
        if (!payment) throw new PaymentFlowError('Payment not found', 404);
        if ((source === 'cash') !== (payment.payment_method === 'cash')) throw new PaymentFlowError('Payment method does not match confirmation source');
        if (source === 'selcom' && payment.payment_method !== 'selcom') throw new PaymentFlowError('Not a Selcom payment');
        const { rows: [existing] } = await client.query('SELECT * FROM internet_sessions WHERE payment_id=$1 AND company_id=$2', [payment.id, companyId]);
        if (payment.status === 'successful' && existing) {
            await client.query('COMMIT'); return { payment, session: existing };
        }
        if (!['pending','awaiting_cash_confirmation'].includes(payment.status) || existing) throw new PaymentFlowError('Payment already processed');
        const duration = Number(durationMinutes ?? payment.duration_minutes);
        if (!Number.isInteger(duration) || duration <= 0 || !payment.router_id || !payment.device_mac) throw new PaymentFlowError('Payment has invalid HotSpot details');
        const { rows: [updated] } = await client.query(`UPDATE payments SET status='successful', paid_at=NOW(),
            verification_source=$3, verified_at=NOW(), provider_transaction_id=$4, confirmed_by_admin_id=$5
            WHERE id=$1 AND company_id=$2 RETURNING *`, [payment.id,companyId,source,providerReference || null,adminId || null]);
        const { rows: [session] } = await client.query(`INSERT INTO internet_sessions
            (company_id,payment_id,package_id,router_id,device_mac,device_ip,mikrotik_login_url,started_at,expires_at,status,created_at)
            VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW()+($8 * INTERVAL '1 minute'),'pending_activation',NOW()) RETURNING *`,
            [companyId,payment.id,payment.package_id,payment.router_id,payment.device_mac,payment.device_ip,payment.mikrotik_login_url,duration]);
        await client.query('INSERT INTO hotspot_jobs(session_id,duration_minutes) VALUES($1,$2)', [session.id,duration]);
        await client.query('COMMIT');
        return { payment: updated, session };
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
}

// A committed job survives restarts. An activation anchor prevents retrying from granting fresh time.
export async function runHotspotJob(sessionId, {db=pool,provisionAccess=provisionHotspotAccess,revokeAccess=revokeHotspotAccess}={}) {
    // Save the deadline before the first external side effect, including process crashes.
    await db.query(`UPDATE hotspot_jobs j SET activation_started_at=NOW() FROM internet_sessions s
        WHERE j.session_id=$1 AND s.id=j.session_id AND s.status='pending_activation'
        AND NOT j.done AND j.activation_started_at IS NULL`,[sessionId]);
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const { rows: [job] } = await client.query(`SELECT j.*, s.company_id,s.router_id,s.device_mac,s.status,s.expires_at,
            c.status AS company_status,
            EXTRACT(EPOCH FROM(j.activation_started_at + j.duration_minutes*INTERVAL '1 minute'))*1000 AS activation_end_ms FROM hotspot_jobs j JOIN internet_sessions s ON s.id=j.session_id
            JOIN companies c ON c.id=s.company_id WHERE j.session_id=$1 AND NOT j.done FOR UPDATE OF j,s`, [sessionId]);
        if (!job) { await client.query('COMMIT'); return; }
        if (job.status === 'active') {
            await client.query('UPDATE hotspot_jobs SET done=TRUE WHERE session_id=$1',[sessionId]);
            await client.query('COMMIT'); return;
        }
        // Serialize changes to a MAC on a router, including different purchases.
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`hotspot:${job.router_id}:${job.device_mac}`]);
        const { rows: [router] } = await client.query('SELECT * FROM mikrotik_routers WHERE id=$1 AND company_id=$2', [job.router_id,job.company_id]);
        if (!router) throw new Error('Router unavailable');
        const { rows: [newer] } = await client.query(`SELECT id FROM internet_sessions WHERE router_id=$1 AND device_mac=$2
            AND id>$3 AND status IN ('active','pending_activation') LIMIT 1`, [job.router_id,job.device_mac,sessionId]);
        if (newer && ['pending_activation','active'].includes(job.status)) {
            await client.query("UPDATE internet_sessions SET status='expired' WHERE id=$1", [sessionId]);
        } else if (newer) {
            // An older session must never disconnect a newer purchase on the same device.
        } else if (job.status !== 'pending_activation' || job.company_status !== 'active') {
            await revokeAccess({router,macAddress:job.device_mac});
            if (job.company_status !== 'active') await client.query("UPDATE internet_sessions SET status='suspended' WHERE id=$1",[sessionId]);
        } else {
            const end = job.activation_started_at
                ? Number(job.activation_end_ms)
                : Date.now() + job.duration_minutes * 60000;
            const remaining = Math.floor((end-Date.now())/1000);
            if (remaining <= 0) {
                await revokeAccess({router,macAddress:job.device_mac});
                await client.query("UPDATE internet_sessions SET status='expired' WHERE id=$1", [sessionId]);
            } else {
                await provisionAccess({router,macAddress:job.device_mac,remainingSeconds:remaining,
                    getRemainingSeconds: () => Math.max(0, Math.floor((end-Date.now())/1000))});
                await client.query(`UPDATE internet_sessions s SET status='active',
                    started_at=j.activation_started_at::timestamp,
                    expires_at=(j.activation_started_at+j.duration_minutes*INTERVAL '1 minute')::timestamp
                    FROM hotspot_jobs j WHERE s.id=$1 AND j.session_id=s.id`,[sessionId]);
            }
        }
        await client.query("UPDATE hotspot_jobs SET done=TRUE,last_error=NULL,revoked=($2 <> 'pending_activation') WHERE session_id=$1", [sessionId,job.status]);
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        await db.query(`UPDATE hotspot_jobs SET attempts=attempts+1,last_error='Router activation or revocation failed',
            next_attempt_at=NOW()+INTERVAL '30 seconds' WHERE session_id=$1`, [sessionId]);
    } finally { client.release(); }
}
export async function processHotspotJobs() {
    const { rows } = await pool.query('SELECT session_id FROM hotspot_jobs WHERE NOT done AND next_attempt_at<=NOW() ORDER BY next_attempt_at LIMIT 25');
    for (const row of rows) await runHotspotJob(row.session_id);
}
