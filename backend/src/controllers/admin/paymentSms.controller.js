import { pool } from '../../database/database.js';
import { manuallyMatchPaymentSms, processPaymentSms } from '../../../services/payment-verification.service.js';

const getCompanyId = req => req.admin.companyId;

export const getPaymentSmsReview = async (req, res) => {
    try {
        const companyId = getCompanyId(req);
        const result = await pool.query(
            `SELECT ps.id, ps.sender, ps.raw_message, ps.provider,
                    ps.provider_transaction_id, ps.payer_phone, ps.amount,
                    ps.received_at, ps.processing_status, ps.processing_error,
                    ps.payment_id, pd.device_name, pd.phone_number AS gateway_phone
             FROM payment_sms ps
             JOIN payment_devices pd ON pd.id=ps.payment_device_id
             WHERE ps.company_id=$1
               AND ps.processing_status IN ('needs_review','error')
             ORDER BY ps.received_at DESC
             LIMIT 100`,
            [companyId]
        );

        const pending = await pool.query(
            `SELECT pay.id, pay.transaction_reference, pay.phone_number, pay.amount,
                    pay.created_at, p.name AS package_name
             FROM payments pay
             JOIN packages p ON p.id=pay.package_id AND p.company_id=pay.company_id
             WHERE pay.company_id=$1 AND pay.status='pending' AND pay.payment_method<>'cash'
             ORDER BY pay.created_at DESC
             LIMIT 100`,
            [companyId]
        );

        return res.json({ success: true, sms_reviews: result.rows, pending_payments: pending.rows });
    } catch (error) {
        console.error('Get payment SMS review error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to load payment SMS review' });
    }
};

export const retryPaymentSms = async (req, res) => {
    const smsId = Number(req.params.id);
    if (!Number.isInteger(smsId) || smsId <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid SMS ID' });
    }

    const owned = await pool.query('SELECT id FROM payment_sms WHERE id=$1 AND company_id=$2', [smsId, getCompanyId(req)]);
    if (!owned.rows.length) return res.status(404).json({ success: false, message: 'Payment SMS not found' });

    await pool.query("UPDATE payment_sms SET processing_status='received', processing_error=NULL WHERE id=$1", [smsId]);
    const result = await processPaymentSms(smsId);
    return res.json({ success: true, result });
};

export const matchPaymentSms = async (req, res) => {
    const smsId = Number(req.params.id);
    const paymentId = Number(req.body?.payment_id);
    if (!Number.isInteger(smsId) || smsId <= 0 || !Number.isInteger(paymentId) || paymentId <= 0) {
        return res.status(400).json({ success: false, message: 'Valid SMS and payment IDs are required' });
    }

    try {
        const session = await manuallyMatchPaymentSms({ smsId, paymentId, companyId: getCompanyId(req) });
        return res.json({ success: true, message: 'Payment matched and activation started', session });
    } catch (error) {
        return res.status(409).json({ success: false, message: error.message });
    }
};
