import { pool } from '../src/database/database.js';
import { PaymentFlowError, runHotspotJob } from './payment-fulfillment.service.js';

// Persist the desired state first. A failed router command remains a retryable job.
export async function changeSessionStatus(companyId,sessionId,status,{db=pool,runJob=runHotspotJob}={}) {
    if (!companyId) throw new PaymentFlowError('Company context required',403);
    if (!['active','suspended','expired'].includes(status)) throw new PaymentFlowError('Choose active, suspended or expired',400);
    const client=await db.connect();
    try {
        await client.query('BEGIN');
        const {rows:[session]}=await client.query(`SELECT s.*,p.duration_minutes,
            GREATEST(0,FLOOR(EXTRACT(EPOCH FROM(s.expires_at-clock_timestamp()::timestamp))))::integer AS remaining_seconds
            FROM internet_sessions s JOIN packages p ON p.id=s.package_id AND p.company_id=s.company_id
            JOIN companies c ON c.id=s.company_id AND c.status='active'
            WHERE s.id=$1 AND s.company_id=$2 FOR UPDATE OF s`,[sessionId,companyId]);
        if (!session) throw new PaymentFlowError('Session not found',404);
        if (status==='active' && session.status==='active') { await client.query('COMMIT'); return session; }
        if (status==='active' && (session.status!=='suspended' || session.remaining_seconds<=0)) throw new PaymentFlowError('Only an unexpired suspended session can be reactivated');
        const target=status==='active' ? 'pending_activation' : status;
        await client.query('UPDATE internet_sessions SET status=$2 WHERE id=$1',[sessionId,target]);
        // Derive the original expiry anchor in SQL to avoid server timezone conversions.
        await client.query(`INSERT INTO hotspot_jobs(session_id,duration_minutes,activation_started_at)
            SELECT id,$2::integer,(expires_at AT TIME ZONE current_setting('TimeZone'))-($2::integer * INTERVAL '1 minute')
            FROM internet_sessions WHERE id=$1
            ON CONFLICT(session_id) DO UPDATE SET done=FALSE,revoked=FALSE,next_attempt_at=NOW(),last_error=NULL,
            duration_minutes=EXCLUDED.duration_minutes,activation_started_at=EXCLUDED.activation_started_at`,
            [sessionId,session.duration_minutes]);
        await client.query('COMMIT');
    } catch(error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
    // Attempt immediately; outages return a visible pending change and the worker retries.
    await runJob(sessionId);
    const {rows:[session]}=await db.query(`SELECT s.*,NOT j.done AS router_change_pending
        FROM internet_sessions s JOIN hotspot_jobs j ON j.session_id=s.id WHERE s.id=$1 AND s.company_id=$2`,[sessionId,companyId]);
    return session;
}
export async function queueExpiredSessions(db=pool) {
    const client=await db.connect();
    try {
        await client.query('BEGIN');
        const {rows}=await client.query(`UPDATE internet_sessions s SET status='expired' FROM packages p
            WHERE p.id=s.package_id AND p.company_id=s.company_id AND s.status IN ('active','expired') AND s.expires_at<=NOW()
            AND NOT EXISTS(SELECT 1 FROM hotspot_jobs j WHERE j.session_id=s.id AND (NOT j.done OR j.revoked))
            RETURNING s.id,p.duration_minutes`);
        for (const row of rows) await client.query(`INSERT INTO hotspot_jobs(session_id,duration_minutes)
            VALUES($1,$2) ON CONFLICT(session_id) DO UPDATE SET done=FALSE,revoked=FALSE,next_attempt_at=NOW()`,[row.id,row.duration_minutes]);
        await client.query('COMMIT');
    } catch(error) { await client.query('ROLLBACK'); throw error; }
    finally {client.release();}
}
