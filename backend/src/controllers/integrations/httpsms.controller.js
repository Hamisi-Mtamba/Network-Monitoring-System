import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { pool } from '../../database/database.js';
import { processPaymentSms } from '../../../services/payment-verification.service.js';

const cleanText = value => typeof value === 'string' ? value.trim() : '';

const getBearerToken = req => {
    const header = cleanText(req.headers.authorization);
    const match = /^Bearer\s+(.+)$/i.exec(header);
    return match?.[1] || '';
};

const verifyWebhook = req => {
    const signingKey = cleanText(process.env.HTTPSMS_WEBHOOK_SIGNING_KEY);
    if (!signingKey) throw new Error('HTTPSMS_WEBHOOK_SIGNING_KEY is not configured');

    const token = getBearerToken(req);
    if (!token) return false;

    try {
        jwt.verify(token, signingKey, { algorithms: ['HS256'] });
        return true;
    } catch {
        return false;
    }
};

const normalizeEvent = body => {
    const data = body?.data && typeof body.data === 'object' ? body.data : body;
    const eventType = cleanText(body?.event || body?.type || body?.event_type);
    const owner = cleanText(data?.owner);
    const gatewayMessageId = cleanText(data?.message_id || data?.messageId || data?.id);
    const sender = cleanText(data?.contact || data?.sender || data?.from);
    const content = cleanText(data?.content || data?.message || data?.text);
    const sim = cleanText(data?.sim);
    const timestamp = cleanText(data?.timestamp || data?.received_at || data?.receivedAt);
    const suppliedEventId = cleanText(body?.id || body?.event_id || body?.eventId);

    const eventId = suppliedEventId || crypto
        .createHash('sha256')
        .update([eventType, owner, gatewayMessageId, sender, content, timestamp].join('|'))
        .digest('hex');

    return { eventType, owner, gatewayMessageId, sender, content, sim, timestamp, eventId };
};

export const receiveHttpSmsWebhook = async (req, res) => {
    // Authenticate before trusting any SMS-looking payload.
    let signatureValid = false;
    try {
        signatureValid = verifyWebhook(req);
    } catch (error) {
        console.error('httpSMS webhook configuration error:', error.message);
        return res.status(503).json({ success: false, message: 'Payment gateway is not configured' });
    }

    if (!signatureValid) {
        return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }

    const event = normalizeEvent(req.body);

    // We only ingest received phone SMS messages at this stage. Heartbeat and
    // other httpSMS events can be added later without mixing them with payments.
    if (event.eventType !== 'message.phone.received') {
        return res.status(200).json({ success: true, ignored: true });
    }

    if (!event.owner || !event.content) {
        return res.status(400).json({ success: false, message: 'Received SMS event is incomplete' });
    }

    try {
        const deviceResult = await pool.query(
            `
            SELECT id, company_id
            FROM payment_devices
            WHERE gateway = 'httpsms'
              AND gateway_owner = $1
              AND is_active = TRUE
            LIMIT 1
            `,
            [event.owner]
        );

        if (deviceResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Payment phone is not registered' });
        }

        const device = deviceResult.rows[0];
        const receivedAt = Number.isFinite(Date.parse(event.timestamp))
            ? new Date(event.timestamp)
            : new Date();

        const insertResult = await pool.query(
            `
            INSERT INTO payment_sms (
                company_id,
                payment_device_id,
                gateway,
                gateway_event_id,
                gateway_message_id,
                sender,
                raw_message,
                sim,
                received_at,
                processing_status,
                raw_payload
            )
            VALUES ($1,$2,'httpsms',$3,$4,$5,$6,$7,$8,'received',$9::jsonb)
            ON CONFLICT (gateway_event_id) DO NOTHING
            RETURNING id
            `,
            [
                device.company_id,
                device.id,
                event.eventId,
                event.gatewayMessageId || null,
                event.sender || null,
                event.content,
                event.sim || null,
                receivedAt,
                JSON.stringify(req.body)
            ]
        );

        // Process a newly stored SMS outside the webhook response path. The worker
        // also retries unprocessed records, so a process restart does not lose it.
        if (insertResult.rows.length > 0) {
            setImmediate(() => {
                processPaymentSms(insertResult.rows[0].id).catch(error =>
                    console.error('httpSMS background processing error:', error.message)
                );
            });
        }

        // Always acknowledge valid duplicate deliveries. httpSMS may retry a
        // webhook, and a retry must never create a second payment activation.
        return res.status(200).json({
            success: true,
            duplicate: insertResult.rows.length === 0
        });
    } catch (error) {
        console.error('httpSMS webhook storage error:', error.message);
        return res.status(500).json({ success: false, message: 'Failed to store payment SMS' });
    }
};
