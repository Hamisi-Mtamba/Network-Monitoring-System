import { randomBytes } from 'node:crypto';
import { pool } from '../src/database/database.js';
import { decryptCredentials, selcomRequest, verifiedOrder } from './selcom-client.service.js';
import { fulfillPayment, PaymentFlowError } from './payment-fulfillment.service.js';

export async function loadSelcomSettings(companyId, requireEnabled = true) {
    const { rows: [settings] } = await pool.query('SELECT * FROM company_selcom_settings WHERE company_id=$1', [companyId]);
    if (!settings || (requireEnabled && !settings.enabled)) throw new PaymentFlowError('Online payments are not configured or enabled',503);
    return settings;
}
export async function prepareSelcomOrder(db,payment,settings,durationMinutes,companyName) {
    const orderId=randomBytes(12).toString('hex');
    const request={vendor:settings.vendor,order_id:orderId,buyer_email:settings.buyer_email,
        buyer_name:companyName+' Wi-Fi customer',buyer_phone:payment.phone_number,
        amount:Number(payment.amount),currency:'TZS',no_of_items:1,
        webhook:Buffer.from(new URL('/api/integrations/selcom/webhook',process.env.PUBLIC_API_URL).href).toString('base64')};
    const {rows:[order]}=await db.query(`INSERT INTO selcom_orders(order_id,payment_id,company_id,amount,duration_minutes,credentials,request)
        VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[orderId,payment.id,payment.company_id,payment.amount,durationMinutes,settings.credentials,request]);
    return order;
}
export async function startSelcomPayment(order) {
    const orderId=order.order_id;
    const {rows:claimed}=await pool.query("UPDATE selcom_orders SET state='initiating',checked_at=NOW() WHERE order_id=$1 AND state='creating' RETURNING order_id",[orderId]);
    if (!claimed.length) return {state:'checking',message:'Payment request is being checked'};
    const credentials=decryptCredentials(order.credentials,order.company_id);
    try {
        await selcomRequest(credentials, 'create-order-minimal', order.request);
        await pool.query("UPDATE selcom_orders SET state='pending' WHERE order_id=$1 AND state<>'completed'", [orderId]);
        await selcomRequest(credentials,'wallet-payment',{transid:orderId,order_id:orderId,msisdn:order.request.buyer_phone});
        return { state:'pending', message:'Approve the payment request on your phone' };
    } catch {
        // A timeout does not establish failure: query the original order instead of charging again.
        await pool.query("UPDATE selcom_orders SET state='checking' WHERE order_id=$1 AND state<>'completed'",[orderId]);
        return { state:'checking', message:'Payment request is being checked. Keep this page open.' };
    }
}
export async function reconcileSelcomOrder(orderId) {
    // Claim a short lease to bound concurrent callback, worker and polling requests.
    const { rows: [order] } = await pool.query(`UPDATE selcom_orders SET checked_at=NOW()
        WHERE order_id=$1 AND state NOT IN ('completed','cancelled','rejected')
        AND (checked_at IS NULL OR checked_at<NOW()-INTERVAL '20 seconds') RETURNING *`, [orderId]);
    if (!order) return;
    const credentials = decryptCredentials(order.credentials, order.company_id);
    const result = await selcomRequest(credentials,'order-status',{order_id:order.order_id},'GET');
    const data = result.data?.[0];
    if (!data || String(data.order_id) !== order.order_id) return;
    if (verifiedOrder(result,order)) {
        const { rows: [payment] } = await pool.query('SELECT transaction_reference FROM payments WHERE id=$1 AND company_id=$2',[order.payment_id,order.company_id]);
        if (!payment) throw new Error('Payment not found');
        await fulfillPayment({companyId:order.company_id,reference:payment.transaction_reference,
            source:'selcom',providerReference:data.reference,durationMinutes:order.duration_minutes});
        await pool.query("UPDATE selcom_orders SET state='completed',provider_reference=$2 WHERE order_id=$1",[orderId,data.reference]);
    } else if (result.resultcode === '000' && ['CANCELLED','USERCANCELLED','REJECTED'].includes(data.payment_status)) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query("UPDATE payments SET status='cancelled' WHERE id=$1 AND company_id=$2 AND status='pending'",[order.payment_id,order.company_id]);
            await client.query("UPDATE selcom_orders SET state='cancelled' WHERE order_id=$1",[orderId]);
            await client.query('COMMIT');
        } catch (error) { await client.query('ROLLBACK'); throw error; }
        finally { client.release(); }
    }
}
export async function processSelcomOrders() {
    const {rows} = await pool.query(`SELECT * FROM selcom_orders
        WHERE state NOT IN ('completed','cancelled','rejected')
        AND (checked_at IS NULL OR checked_at<NOW()-INTERVAL '30 seconds')
        ORDER BY checked_at NULLS FIRST LIMIT 20`);
    for (const row of rows) {
        try {
            if (row.state==='creating') await startSelcomPayment(row);
            else await reconcileSelcomOrder(row.order_id);
        }
        catch { console.error('Selcom reconciliation deferred:',row.order_id); }
    }
}
