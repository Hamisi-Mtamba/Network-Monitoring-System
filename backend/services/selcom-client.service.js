import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// Tenant secrets use authenticated encryption and are bound to their company ID.
const encryptionKey = () => {
    const key = Buffer.from(process.env.PAYMENT_ENCRYPTION_KEY || '', 'base64');
    if (key.length !== 32) throw new Error('PAYMENT_ENCRYPTION_KEY must be 32 bytes encoded as base64');
    return key;
};
export function encryptCredentials(value, companyId) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
    cipher.setAAD(Buffer.from(String(companyId)));
    const data = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map(v => v.toString('base64')).join('.');
}
export function decryptCredentials(value, companyId) {
    const [iv, tag, data] = value.split('.').map(v => Buffer.from(v, 'base64'));
    const cipher = createDecipheriv('aes-256-gcm', encryptionKey(), iv);
    cipher.setAAD(Buffer.from(String(companyId)));
    cipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8'));
}
export function digest(fields, timestamp, secret) {
    const text = `timestamp=${timestamp}&` + Object.entries(fields).map(([k,v]) => `${k}=${v}`).join('&');
    return createHmac('sha256', secret).update(text).digest('base64');
}
export function verifyWebhook(headers, body, credentials) {
    const required = ['transid','order_id','reference','result','resultcode','payment_status'];
    const names = String(headers['signed-fields'] || '').split(',').map(v => v.trim());
    if (headers['digest-method'] !== 'HS256' || !required.every(k => names.includes(k)) ||
        new Set(names).size !== names.length || names.some(k => !Object.hasOwn(body, k) || typeof body[k] === 'object')) return false;
    if (!headers.timestamp || !headers.digest) return false;
    const expected = Buffer.from(digest(Object.fromEntries(names.map(k => [k, body[k]])), headers.timestamp, credentials.api_secret));
    const actual = Buffer.from(String(headers.digest));
    return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export async function selcomRequest(credentials, path, fields, method = 'POST', fetcher = fetch) {
    const base = new URL(process.env.SELCOM_BASE_URL || 'https://apigw.selcommobile.com');
    if (base.protocol !== 'https:' || base.username || base.password) throw new Error('Selcom requires an HTTPS base URL');
    const url = new URL(`/v1/checkout/${path}`, base);
    const timestamp = new Date().toISOString();
    if (method === 'GET') url.search = new URLSearchParams(fields).toString();
    const response = await fetcher(url, {
        method, redirect: 'error', signal: AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/json', Accept: 'application/json',
            Authorization: `SELCOM ${Buffer.from(credentials.api_key).toString('base64')}`,
            'Digest-Method': 'HS256', Digest: digest(fields, timestamp, credentials.api_secret),
            Timestamp: timestamp, 'Signed-Fields': Object.keys(fields).join(',') },
        ...(method === 'GET' ? {} : {body: JSON.stringify(fields)})
    });
    if (!response.ok) throw new Error('Selcom request failed');
    const result = await response.json();
    if (!['000','111'].includes(String(result.resultcode))) throw new Error('Selcom rejected request');
    return result;
}
export function verifiedOrder(result, order) {
    const data = result?.data?.[0];
    return result?.resultcode === '000' && data?.payment_status === 'COMPLETED' &&
        String(data.order_id) === order.order_id && Number.isFinite(Number(data.amount)) &&
        Number(data.amount) === Number(order.amount) &&
        (!data.currency || data.currency === 'TZS') && !!data.reference;
}
