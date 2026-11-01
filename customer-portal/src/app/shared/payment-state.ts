import { PaymentStatusResponse } from '../models/payment.model';
export type PaymentView='pending'|'cash'|'activating'|'active'|'suspended'|'expired'|'failed';
// Never infer active access from a successful payment, cached data, or an estimated deadline.
export function paymentView(response:PaymentStatusResponse,now=Date.now()):PaymentView {
    const payment=response.payment;
    if(['failed','cancelled','rejected'].includes(payment.status))return 'failed';
    if(payment.status!=='successful')return payment.payment_method==='cash' ? 'cash':'pending';
    const session=response.session;
    if(!session || ['pending_activation','pending','pending activation'].includes(session.status))return 'activating';
    if(session.status==='suspended')return 'suspended';
    if(session.status==='expired')return 'expired';
    if(session.status==='failed')return 'activating';
    const expiry=Date.parse(session.expires_at);
    if(session.status==='active' && Number.isFinite(expiry))return expiry>now ? 'active':'expired';
    return 'activating';
}
export function browsingUrl(original?:string|null):string {
    try {const url=new URL(original || '');if(['http:','https:'].includes(url.protocol)&&!url.username&&!url.password)return url.href;}catch{}
    return 'https://www.google.com';
}
