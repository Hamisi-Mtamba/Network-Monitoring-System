import { pool } from '../../database/database.js';
import { encryptCredentials, decryptCredentials, selcomRequest } from '../../../services/selcom-client.service.js';
const companyId = req => req.admin?.role === 'superadmin' ? req.platformCompany?.id : req.admin?.companyId;
const publicSettings = row => ({provider:'selcom',enabled:row?.enabled || false,vendor:row?.vendor || '',
    buyer_email:row?.buyer_email || '',api_key_present:!!row?.credentials,api_secret_present:!!row?.credentials});
export async function getSelcomSettings(req,res) {
    if (!companyId(req)) return res.status(403).json({success:false});
    try {
        const {rows:[row]} = await pool.query('SELECT * FROM company_selcom_settings WHERE company_id=$1',[companyId(req)]);
        return res.json({success:true,payment:publicSettings(row)});
    } catch { return res.status(500).json({success:false,message:'Unable to load payment settings'}); }
}
export async function updateCompanyPaymentSettings(req,res) {
    const id = companyId(req);
    if (!id) return res.status(403).json({success:false});
    const input = req.body?.payment;
    if (!input || typeof input !== 'object' || Array.isArray(input)) return res.status(400).json({success:false,message:'Payment settings are required'});
    const allowed = ['enabled','vendor','buyer_email','api_key','api_secret'];
    if (Object.keys(input).some(k => !allowed.includes(k))) return res.status(400).json({success:false,message:'Only Selcom payment settings are supported'});
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('SELECT id FROM companies WHERE id=$1 FOR UPDATE',[id]);
        const {rows:[old]} = await client.query('SELECT * FROM company_selcom_settings WHERE company_id=$1',[id]);
        const previous = old ? decryptCredentials(old.credentials,id) : {};
        // Blank secret fields mean keep the saved value; secrets are never sent to clients.
        const credentials = {};
        for (const key of ['api_key','api_secret']) {
            if (input[key] != null && (typeof input[key] !== 'string' || input[key].length>4096)) throw new Error('Invalid credentials');
            credentials[key] = input[key]?.trim() || previous[key];
            if (!credentials[key]) throw new Error('API key and API secret are required');
        }
        const vendor = input.vendor ?? old?.vendor;
        const email = input.buyer_email ?? old?.buyer_email;
        const enabled = input.enabled ?? old?.enabled ?? false;
        if (typeof enabled !== 'boolean' || typeof vendor !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(vendor) ||
            typeof email !== 'string' || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Valid vendor, buyer email and enabled flag are required');
        const {rows:[row]} = await client.query(`INSERT INTO company_selcom_settings(company_id,enabled,vendor,buyer_email,credentials)
            VALUES($1,$2,$3,$4,$5) ON CONFLICT(company_id) DO UPDATE SET enabled=EXCLUDED.enabled,vendor=EXCLUDED.vendor,
            buyer_email=EXCLUDED.buyer_email,credentials=EXCLUDED.credentials,updated_at=NOW() RETURNING *`,
            [id,enabled,vendor,email,encryptCredentials(credentials,id)]);
        await client.query('COMMIT');
        return res.json({success:true,message:'Selcom settings saved',payment:publicSettings(row)});
    } catch (error) {
        await client.query('ROLLBACK');
        const validation = /Invalid credentials|required/.test(error.message);
        return res.status(validation ? 400 : 500).json({success:false,message:validation ? error.message : 'Unable to save payment settings'});
    } finally { client.release(); }
}
export async function testSelcomConnection(req,res) {
    if (!companyId(req)) return res.status(403).json({success:false});
    try {
        const {rows:[row]} = await pool.query('SELECT * FROM company_selcom_settings WHERE company_id=$1',[companyId(req)]);
        if (!row) return res.status(400).json({success:false,message:'Save credentials first'});
        const today = new Date().toISOString().slice(0,10);
        await selcomRequest(decryptCredentials(row.credentials,row.company_id),'list-orders',{fromdate:today,todate:today},'GET');
        return res.json({success:true,message:'Selcom credentials accepted'});
    } catch { return res.status(502).json({success:false,message:'Selcom connection failed; check credentials and account permissions'}); }
}
