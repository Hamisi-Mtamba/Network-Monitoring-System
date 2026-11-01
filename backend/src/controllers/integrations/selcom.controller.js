import { pool } from '../../database/database.js';
import { decryptCredentials, verifyWebhook } from '../../../services/selcom-client.service.js';
import { reconcileSelcomOrder } from '../../../services/selcom-payment.service.js';

// The callback is a signed notification; only a server-side status query can confirm money.
export async function receiveSelcomWebhook(req,res) {
    try {
        const orderId = req.body?.order_id;
        if (typeof orderId !== 'string' || !/^[a-f0-9]{24}$/.test(orderId)) return res.status(400).json({success:false});
        const {rows:[order]} = await pool.query('SELECT * FROM selcom_orders WHERE order_id=$1',[orderId]);
        if (!order) return res.status(404).json({success:false});
        if (!verifyWebhook(req.headers,req.body,decryptCredentials(order.credentials,order.company_id))) {
            return res.status(401).json({success:false});
        }
        await reconcileSelcomOrder(orderId);
        return res.json({success:true});
    } catch { return res.status(503).json({success:false,message:'Verification will be retried'}); }
}
