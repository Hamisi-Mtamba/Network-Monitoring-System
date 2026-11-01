import { setTimeout as delay } from 'node:timers/promises';
const METHODS = Object.freeze({selcom:'SELCOM',mpesa:'MPESA',airtel_money:'AIRTELMONEY',mixx_by_yas:'MIXX',halopesa:'HALOPESA',cash:'CASH'});
export class PaymentReferenceError extends Error {
    constructor(message,status=400) { super(message); this.status=status; }
}
export function normalizePaymentIdentity({paymentMethod,phoneNumber,macAddress}) {
    const method=typeof paymentMethod === 'string' ? paymentMethod.trim().toLowerCase() : '';
    if (!Object.hasOwn(METHODS,method)) throw new PaymentReferenceError('Unsupported payment method');
    let phone=typeof phoneNumber === 'string' ? phoneNumber.trim().replace(/^\+/,'') : '';
    if (/^0[67]\d{8}$/.test(phone)) phone=`255${phone.slice(1)}`;
    const optional=method==='cash' && (phoneNumber==null || (typeof phoneNumber==='string' && !phoneNumber.trim()));
    if (!optional && !/^255[67]\d{8}$/.test(phone)) throw new PaymentReferenceError('Invalid Tanzanian mobile number');
    const mac=typeof macAddress==='string' ? macAddress.replace(/[:\-\s]/g,'').toUpperCase() : '';
    if (!/^[0-9A-F]{12}$/.test(mac)) throw new PaymentReferenceError('Invalid device MAC address');
    return {method,phone,mac};
}
export function generateTransactionReference({paymentMethod,phoneNumber,macAddress,endingTime}) {
    const {method,phone,mac}=normalizePaymentIdentity({paymentMethod,phoneNumber,macAddress});
    if (typeof endingTime!=='string' || !/^\d{14}$/.test(endingTime)) throw new PaymentReferenceError('Invalid reference ending time');
    const iso=`${endingTime.slice(0,4)}-${endingTime.slice(4,6)}-${endingTime.slice(6,8)}T${endingTime.slice(8,10)}:${endingTime.slice(10,12)}:${endingTime.slice(12)}.000Z`;
    const date=new Date(iso);
    if (!Number.isFinite(date.getTime()) || date.toISOString()!==iso) throw new PaymentReferenceError('Invalid reference ending time');
    return [METHODS[method],...(phone ? [phone] : []),mac,endingTime].join('-');
}
// Callers with an existing transaction set manageTransaction=false; all inserts retain trusted DB prices.
export async function createReferencedPayment({db,companyId,packageId,routerId,paymentMethod,phoneNumber,macAddress,ipAddress,loginUrl},
    {wait=delay,manageTransaction=true}={}) {
    const identity=normalizePaymentIdentity({paymentMethod,phoneNumber,macAddress});
    const client=typeof db.connect==='function' ? await db.connect() : db;
    try {
        if (manageTransaction) await client.query('BEGIN');
        for (let attempt=0;attempt<5;attempt++) {
            const {rows:[pkg]}=await client.query(`WITH moment AS MATERIALIZED (SELECT clock_timestamp()::timestamp AS started_at)
                SELECT p.price,p.duration_minutes,to_char(moment.started_at,'YYYY-MM-DD HH24:MI:SS.US') AS started_at,
                to_char(moment.started_at+p.duration_minutes*INTERVAL '1 minute','YYYYMMDDHH24MISS') AS ending_time
                FROM packages p CROSS JOIN moment WHERE p.id=$1 AND p.company_id=$2 AND p.is_active=TRUE
                AND (p.available_from IS NULL OR p.available_from<=CURRENT_TIMESTAMP)
                AND (p.available_until IS NULL OR p.available_until>=CURRENT_TIMESTAMP)`,[packageId,companyId]);
            if (!pkg) throw new PaymentReferenceError('Package not found or unavailable',404);
            if (!Number.isFinite(Number(pkg.price)) || Number(pkg.price)<=0 || !Number.isInteger(Number(pkg.duration_minutes)) || Number(pkg.duration_minutes)<=0) throw new PaymentReferenceError('Invalid package price or duration');
            const reference=generateTransactionReference({paymentMethod:identity.method,phoneNumber:identity.phone,macAddress:identity.mac,endingTime:pkg.ending_time});
            const result=await client.query(`INSERT INTO payments(company_id,package_id,phone_number,payment_method,amount,
                transaction_reference,status,router_id,device_mac,device_ip,mikrotik_login_url,created_at,purchased_duration_minutes)
                VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::timestamp,$13)
                ON CONFLICT (transaction_reference) DO NOTHING RETURNING *`,
                [companyId,packageId,identity.phone,identity.method,pkg.price,reference,
                    identity.method==='cash' ? 'awaiting_cash_confirmation' : 'pending',routerId,
                    identity.mac.match(/.{2}/g).join(':'),ipAddress.trim(),loginUrl.trim(),pkg.started_at,pkg.duration_minutes]);
            if (result.rows.length) {
                if (manageTransaction) await client.query('COMMIT');
                return result;
            }
            if (attempt<4) await wait(1000);
        }
        throw new PaymentReferenceError('Please retry after a few seconds',409);
    } catch(error) { if (manageTransaction) await client.query('ROLLBACK'); throw error; }
    finally { if (client!==db && client.release) client.release(); }
}
