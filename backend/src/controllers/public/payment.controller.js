import { isIP } from 'node:net';
import { pool } from '../../database/database.js';
import { createReferencedPayment, normalizePaymentIdentity, PaymentReferenceError } from '../../../services/transaction-reference.service.js';
import { loadSelcomSettings, prepareSelcomOrder, startSelcomPayment } from '../../../services/selcom-payment.service.js';
import { PaymentFlowError } from '../../../services/payment-fulfillment.service.js';

// Validate all portal inputs before creating a bill; price and duration come from the database.
async function createPayment(req,res,cash) {
    try {
        const slug = req.params.companySlug?.trim().toLowerCase();
        const input = req.body || {};
        const packageId = Number(input.package_id);
        const method = cash ? 'cash' : 'selcom';
        if (!cash && input.payment_method && input.payment_method !== 'selcom') throw new PaymentReferenceError('Use Selcom for online payments');
        const identity = normalizePaymentIdentity({paymentMethod:method,phoneNumber:input.phone_number,macAddress:input.mac});
        const loginUrl = input.login_url ?? input.loginUrl;
        let parsed;
        try { parsed = new URL(loginUrl); } catch { throw new PaymentReferenceError('Invalid MikroTik login URL'); }
        if (!['http:','https:'].includes(parsed.protocol) || parsed.username || parsed.password ||
            typeof input.ip !== 'string' || !isIP(input.ip) || typeof input.router !== 'string' ||
            !Number.isSafeInteger(packageId) || packageId<=0) throw new PaymentReferenceError('Invalid package or MikroTik connection information');
        const {rows:[company]} = await pool.query("SELECT id,name,slug FROM companies WHERE slug=$1 AND status='active'",[slug]);
        if (!company) throw new PaymentReferenceError('Company not found',404);
        const {rows:[router]} = await pool.query("SELECT id FROM mikrotik_routers WHERE company_id=$1 AND public_id=$2 AND status='active'",[company.id,input.router]);
        if (!router) throw new PaymentReferenceError('Router unavailable',400);
        let settings;
        if (!cash) {
            settings = await loadSelcomSettings(company.id);
            try { if (new URL(process.env.PUBLIC_API_URL).protocol !== 'https:') throw new Error(); }
            catch { throw new PaymentFlowError('Public HTTPS callback URL is not configured',503); }
        }
        const mac = identity.mac.match(/.{2}/g).join(':');
        const client = await pool.connect();
        let payment, duration, order;
        try {
            // A transaction-scoped device lock prevents simultaneous clicks from creating duplicate charges.
            await client.query('BEGIN');
            await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`checkout:${company.id}:${router.id}:${mac}`]);
            const {rows:[existing]} = await client.query(`SELECT pay.id,pay.transaction_reference FROM payments pay
                WHERE company_id=$1 AND router_id=$2 AND device_mac=$3
                AND (status IN ('pending','awaiting_cash_confirmation') OR
                    EXISTS(SELECT 1 FROM internet_sessions s WHERE s.payment_id=pay.id AND (s.status='pending_activation' OR (s.status='active' AND s.expires_at>NOW()))))
                ORDER BY id DESC LIMIT 1`,[company.id,router.id,mac]);
            if (existing) {
                await client.query('ROLLBACK');
                return res.status(409).json({success:false,message:'This device already has a pending payment or internet session',reference:existing.transaction_reference});
            }
            const {rows:[pkg]} = await client.query(`SELECT duration_minutes FROM packages WHERE id=$1 AND company_id=$2
                AND is_active=TRUE AND (available_from IS NULL OR available_from<=NOW())
                AND (available_until IS NULL OR available_until>=NOW()) FOR SHARE`,[packageId,company.id]);
            if (!pkg) throw new PaymentReferenceError('Package unavailable',404);
            duration=Number(pkg.duration_minutes);
            const result = await createReferencedPayment({db:client,companyId:company.id,packageId,routerId:router.id,
                paymentMethod:method,phoneNumber:input.phone_number,macAddress:input.mac,ipAddress:input.ip,loginUrl}, {manageTransaction:false});
            payment=result.rows[0];
            if (!cash) order=await prepareSelcomOrder(client,payment,settings,duration,company.name);
            await client.query('COMMIT');
        } catch(error) { await client.query('ROLLBACK'); throw error; }
        finally { client.release(); }
        const gateway = cash ? undefined : await startSelcomPayment(order);
        return res.status(201).json({success:true,payment,...(gateway ? {gateway} : {}),
            message:cash ? 'Cash request sent. A company administrator must confirm receipt.' : gateway.message});
    } catch(error) {
        const status = error instanceof PaymentReferenceError || error instanceof PaymentFlowError ? error.status : 500;
        return res.status(status).json({success:false,message:status === 500 ? 'Unable to create payment; check status before trying again' : error.message});
    }
}
export const initiatePayment = (req,res) => createPayment(req,res,false);
export const createCashPaymentRequest = (req,res) => createPayment(req,res,true);
export async function getPaymentStatus(req,res) {
    try {
        const {rows:[payment]} = await pool.query(`SELECT pay.id,pay.company_id,pay.package_id,pay.payment_method,pay.amount,
            pay.transaction_reference,pay.status,pay.created_at,pay.paid_at,p.name AS package_name,p.duration_minutes
            FROM payments pay JOIN companies c ON c.id=pay.company_id AND c.status='active'
            JOIN packages p ON p.id=pay.package_id AND p.company_id=pay.company_id
            WHERE c.slug=$1 AND pay.transaction_reference=$2`,[req.params.companySlug?.trim().toLowerCase(),req.params.reference]);
        if (!payment) return res.status(404).json({success:false,message:'Payment not found'});
        const {rows:[session]} = await pool.query(`SELECT id,company_id,payment_id,package_id,router_id,device_mac,device_ip,
            mikrotik_login_url,started_at,expires_at,status,created_at FROM internet_sessions WHERE payment_id=$1 AND company_id=$2
            ORDER BY id DESC LIMIT 1`,[payment.id,payment.company_id]);
        return res.json({success:true,payment,session:session || null});
    } catch { return res.status(500).json({success:false,message:'Unable to fetch payment status'}); }
}
