import { pool } from '../src/database/database.js';
import { provisionHotspotAccess } from './mikrotik.service.js';
import { normalizeTanzanianPhone, parsePaymentSms } from './payment-sms-parser.service.js';

// Keep automatic matching configurable while bounding unsafe values.
const matchWindowMinutes = () => {
    const value = Number(process.env.PAYMENT_MATCH_WINDOW_MINUTES || 15);
    return Number.isInteger(value) && value >= 5 && value <= 120 ? value : 15;
};

// Persist parsed SMS details when an automatic match cannot be completed.
const markReview = async (smsId, status, reason, parsed = {}) => {
    await pool.query(
        `UPDATE payment_sms
         SET provider = COALESCE($2, provider),
             provider_transaction_id = COALESCE($3, provider_transaction_id),
             payer_phone = COALESCE($4, payer_phone),
             amount = COALESCE($5, amount),
             processing_status = $6,
             processing_error = $7,
             processed_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [smsId, parsed.provider || null, parsed.providerTransactionId || null,
            parsed.payerPhone || null, parsed.amount ?? null, status, reason]
    );
};

// Router activation happens after the payment transaction commits.
const provisionSession = async session => {

    try {

        const routerResult =
            await pool.query(
                `SELECT
                    id,
                    company_id,
                    public_id,
                    name,
                    host,
                    status,
                    api_username,
                    api_password
                 FROM mikrotik_routers
                 WHERE id = $1
                   AND company_id = $2
                   AND status = 'active'
                 LIMIT 1`,
                [
                    session.router_id,
                    session.company_id
                ]
            );


        const router =
            routerResult.rows[0];


        if (!router) {

            throw new Error(
                'Active MikroTik router was not found for this session'
            );
        }


        await provisionHotspotAccess({

            router,

            macAddress:
                session.device_mac,

            durationMinutes:
                Number(
                    session.duration_minutes
                )
        });


        await pool.query(
            `UPDATE internet_sessions
             SET status = 'active'
             WHERE id = $1
               AND status = 'pending_activation'`,
            [
                session.id
            ]
        );

    } catch (error) {

        console.error(
            'Automatic payment MikroTik activation error:',
            error.message
        );


        await pool.query(
            `UPDATE internet_sessions
             SET status = 'pending_activation'
             WHERE id = $1`,
            [
                session.id
            ]
        );
    }
};

// Match one incoming SMS to exactly one pending non-cash payment.
export const processPaymentSms = async smsId => {
    const client = await pool.connect();
    let sessionToProvision = null;

    try {
        await client.query('BEGIN');

        const smsResult = await client.query(
            `SELECT * FROM payment_sms WHERE id = $1 FOR UPDATE`,
            [smsId]
        );
        const sms = smsResult.rows[0];
        if (!sms) {
            await client.query('ROLLBACK');
            return { status: 'missing' };
        }

        if (['matched', 'duplicate', 'ignored'].includes(sms.processing_status)) {
            await client.query('COMMIT');
            return { status: sms.processing_status };
        }

        const parsed = parsePaymentSms({ sender: sms.sender, message: sms.raw_message });

        if (!parsed.complete) {
            await client.query(
                `UPDATE payment_sms
                 SET provider=$2, provider_transaction_id=$3, payer_phone=$4, amount=$5,
                     processing_status='needs_review', processing_error=$6,
                     processed_at=CURRENT_TIMESTAMP
                 WHERE id=$1`,
                [sms.id, parsed.provider, parsed.providerTransactionId || null,
                parsed.payerPhone || null, parsed.amount ?? null,
                `Missing: ${parsed.missing.join(', ')}`]
            );
            await client.query('COMMIT');
            return { status: 'needs_review' };
        }

        const duplicate = await client.query(
            `SELECT id FROM payments
             WHERE company_id=$1 AND provider_transaction_id=$2
             LIMIT 1`,
            [sms.company_id, parsed.providerTransactionId]
        );
        if (duplicate.rows.length > 0) {
            await client.query(
                `UPDATE payment_sms
                 SET provider=$2, provider_transaction_id=$3, payer_phone=$4, amount=$5,
                     processing_status='duplicate', processing_error='Provider transaction already used',
                     processed_at=CURRENT_TIMESTAMP
                 WHERE id=$1`,
                [sms.id, parsed.provider, parsed.providerTransactionId, parsed.payerPhone, parsed.amount]
            );
            await client.query('COMMIT');
            return { status: 'duplicate' };
        }

        // Match against payments created before the SMS and within the time window.
        const candidates = await client.query(
            `SELECT pay.*, p.duration_minutes
            FROM payments pay
            JOIN packages p
            ON p.id = pay.package_id
            AND p.company_id = pay.company_id
            WHERE pay.company_id = $1
            AND pay.status = 'pending'
            AND pay.payment_method <> 'cash'

            -- Payment must have existed before this SMS arrived.
            AND pay.created_at <= $4

            -- Only consider recent pending payments.
            AND pay.created_at >= $4 - ($2::text || ' minutes')::interval

            -- Amount must match exactly, allowing only tiny decimal tolerance.
            AND ABS(COALESCE(pay.amount, 0)::numeric - $3::numeric) < 0.01

            ORDER BY pay.created_at DESC
            FOR UPDATE OF pay`,
            [
                sms.company_id,
                matchWindowMinutes(),
                parsed.amount,
                sms.received_at
            ]
        );

        // Phone matching is performed in normalized international format.
        const phoneMatches = candidates.rows.filter(row =>
            normalizeTanzanianPhone(row.phone_number) === parsed.payerPhone
        );

        if (phoneMatches.length !== 1) {
            const reason = phoneMatches.length === 0
                ? 'No exact pending payment matched company, payer phone, amount and time window'
                : 'More than one pending payment matched payer phone and amount';
            await client.query(
                `UPDATE payment_sms
                 SET provider=$2, provider_transaction_id=$3, payer_phone=$4, amount=$5,
                     processing_status='needs_review', processing_error=$6,
                     processed_at=CURRENT_TIMESTAMP
                 WHERE id=$1`,
                [sms.id, parsed.provider, parsed.providerTransactionId, parsed.payerPhone, parsed.amount, reason]
            );
            await client.query('COMMIT');
            return { status: 'needs_review' };
        }

        const payment = phoneMatches[0];
        const existingSession = await client.query(
            `SELECT id FROM internet_sessions WHERE payment_id=$1 AND company_id=$2 LIMIT 1`,
            [payment.id, payment.company_id]
        );
        if (existingSession.rows.length > 0) {
            await client.query(
                `UPDATE payment_sms
                 SET payment_id=$2, provider=$3, provider_transaction_id=$4,
                     payer_phone=$5, amount=$6, processing_status='duplicate',
                     processing_error='Payment already has an internet session', processed_at=CURRENT_TIMESTAMP
                 WHERE id=$1`,
                [sms.id, payment.id, parsed.provider, parsed.providerTransactionId, parsed.payerPhone, parsed.amount]
            );
            await client.query('COMMIT');
            return { status: 'duplicate' };
        }

        const updated = await client.query(
            `UPDATE payments
             SET status='successful', paid_at=CURRENT_TIMESTAMP,
                 provider_transaction_id=$2, verification_source='httpsms',
                 verified_at=CURRENT_TIMESTAMP, matched_payment_sms_id=$3
             WHERE id=$1 AND status='pending'
             RETURNING *`,
            [payment.id, parsed.providerTransactionId, sms.id]
        );
        if (!updated.rows.length) throw new Error('Pending payment changed during verification');

        const sessionResult = await client.query(
            `INSERT INTO internet_sessions (
                company_id, payment_id, package_id, router_id,
                device_mac, device_ip, mikrotik_login_url,
                started_at, expires_at, status, created_at
             ) VALUES (
                $1,$2,$3,$4,$5,$6,$7,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP + ($8 * INTERVAL '1 minute'),
                'pending_activation', CURRENT_TIMESTAMP
             )
             RETURNING id, company_id, payment_id, package_id, router_id,
                       device_mac, device_ip, mikrotik_login_url,
                       started_at, expires_at, status`,
            [payment.company_id, payment.id, payment.package_id, payment.router_id,
            payment.device_mac, payment.device_ip, payment.mikrotik_login_url,
            Number(payment.duration_minutes)]
        );

        await client.query(
            `UPDATE payment_sms
             SET payment_id=$2, provider=$3, provider_transaction_id=$4,
                 payer_phone=$5, amount=$6, processing_status='matched',
                 processing_error=NULL, processed_at=CURRENT_TIMESTAMP
             WHERE id=$1`,
            [sms.id, payment.id, parsed.provider, parsed.providerTransactionId,
            parsed.payerPhone, parsed.amount]
        );

        await client.query('COMMIT');
        sessionToProvision = { ...sessionResult.rows[0], duration_minutes: payment.duration_minutes };
    } catch (error) {
        try { await client.query('ROLLBACK'); } catch { }
        console.error('Automatic payment verification error:', error.message);
        await markReview(smsId, 'error', error.message).catch(() => { });
        return { status: 'error', error: error.message };
    } finally {
        client.release();
    }

    if (sessionToProvision) {
        await provisionSession(sessionToProvision);
        return { status: 'matched', sessionId: sessionToProvision.id };
    }

    return { status: 'processed' };
};

export const processPendingPaymentSms = async () => {
    const result = await pool.query(
        `SELECT id FROM payment_sms
         WHERE processing_status IN ('received','error')
         ORDER BY received_at ASC
         LIMIT 25`
    );

    for (const row of result.rows) {
        await processPaymentSms(row.id);
    }
};

// Allow an operator to approve a specific SMS/payment pair after review.
export const manuallyMatchPaymentSms = async ({ smsId, paymentId, companyId }) => {
    const client = await pool.connect();
    let sessionToProvision = null;

    try {
        await client.query('BEGIN');

        const smsResult = await client.query(
            `SELECT * FROM payment_sms WHERE id=$1 AND company_id=$2 FOR UPDATE`,
            [smsId, companyId]
        );
        const sms = smsResult.rows[0];
        if (!sms) throw new Error('Payment SMS not found');

        const parsed = parsePaymentSms({ sender: sms.sender, message: sms.raw_message });
        const providerTransactionId = sms.provider_transaction_id || parsed.providerTransactionId;
        const payerPhone = sms.payer_phone || parsed.payerPhone;
        const amount = Number(sms.amount ?? parsed.amount);
        const provider = sms.provider || parsed.provider;

        if (!providerTransactionId) throw new Error('SMS does not contain a usable transaction ID');
        if (!Number.isFinite(amount) || amount <= 0) throw new Error('SMS does not contain a usable payment amount');

        const paymentResult = await client.query(
            `SELECT pay.*, p.duration_minutes
             FROM payments pay
             JOIN packages p ON p.id=pay.package_id AND p.company_id=pay.company_id
             WHERE pay.id=$1 AND pay.company_id=$2
             FOR UPDATE OF pay`,
            [paymentId, companyId]
        );
        const payment = paymentResult.rows[0];
        if (!payment) throw new Error('Pending payment not found');
        if (payment.status !== 'pending') throw new Error('Selected payment is no longer pending');
        if (payment.payment_method === 'cash') throw new Error('Cash payments use the cash-confirmation workflow');
        if (Math.abs(Number(payment.amount) - amount) >= 0.01) {
            throw new Error('SMS amount does not match the selected payment amount');
        }

        const duplicate = await client.query(
            `SELECT id FROM payments
             WHERE company_id=$1 AND provider_transaction_id=$2 AND id<>$3
             LIMIT 1`,
            [companyId, providerTransactionId, payment.id]
        );
        if (duplicate.rows.length) throw new Error('Provider transaction ID is already used');

        const existingSession = await client.query(
            `SELECT id FROM internet_sessions WHERE payment_id=$1 AND company_id=$2 LIMIT 1`,
            [payment.id, companyId]
        );
        if (existingSession.rows.length) throw new Error('Selected payment already has an internet session');

        await client.query(
            `UPDATE payments
             SET status='successful', paid_at=CURRENT_TIMESTAMP,
                 provider_transaction_id=$2, verification_source='httpsms_manual',
                 verified_at=CURRENT_TIMESTAMP, matched_payment_sms_id=$3
             WHERE id=$1`,
            [payment.id, providerTransactionId, sms.id]
        );

        const sessionResult = await client.query(
            `INSERT INTO internet_sessions (
                company_id, payment_id, package_id, router_id,
                device_mac, device_ip, mikrotik_login_url,
                started_at, expires_at, status, created_at
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_TIMESTAMP,
                       CURRENT_TIMESTAMP + ($8 * INTERVAL '1 minute'),
                       'pending_activation',CURRENT_TIMESTAMP)
             RETURNING id, company_id, payment_id, package_id, router_id,
                       device_mac, device_ip, mikrotik_login_url,
                       started_at, expires_at, status`,
            [payment.company_id, payment.id, payment.package_id, payment.router_id,
            payment.device_mac, payment.device_ip, payment.mikrotik_login_url,
            Number(payment.duration_minutes)]
        );

        await client.query(
            `UPDATE payment_sms
             SET payment_id=$2, provider=$3, provider_transaction_id=$4,
                 payer_phone=COALESCE($5,payer_phone), amount=$6,
                 processing_status='matched', processing_error=NULL,
                 processed_at=CURRENT_TIMESTAMP
             WHERE id=$1`,
            [sms.id, payment.id, provider, providerTransactionId, payerPhone || null, amount]
        );

        await client.query('COMMIT');
        sessionToProvision = { ...sessionResult.rows[0], duration_minutes: payment.duration_minutes };
    } catch (error) {
        try { await client.query('ROLLBACK'); } catch { }
        throw error;
    } finally {
        client.release();
    }

    await provisionSession(sessionToProvision);
    return sessionToProvision;
};
