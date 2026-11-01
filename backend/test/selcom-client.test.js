import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { encryptCredentials,decryptCredentials,digest,verifyWebhook,selcomRequest,verifiedOrder } from '../services/selcom-client.service.js';
const credentials={api_key:'test-key',api_secret:'test-secret'};
test('credentials are randomized, encrypted and bound to one tenant',()=>{
    process.env.PAYMENT_ENCRYPTION_KEY=Buffer.alloc(32,9).toString('base64');
    const a=encryptCredentials(credentials,1),b=encryptCredentials(credentials,1);
    assert.notEqual(a,b); assert.ok(!a.includes('test-secret'));
    assert.deepEqual(decryptCredentials(a,1),credentials);
    assert.throws(()=>decryptCredentials(a,2));
    const parts=a.split('.');parts[2]=Buffer.from('tampered').toString('base64');
    assert.throws(()=>decryptCredentials(parts.join('.'),1));
});
test('request signature follows documented ordered-field HMAC format',async()=>{
    const fields={order_id:'abc'};
    const result=await selcomRequest(credentials,'order-status',fields,'GET',async(url,options)=>{
        assert.equal(url.search,'?order_id=abc');
        assert.equal(options.headers.Authorization,'SELCOM dGVzdC1rZXk=');
        const expected=createHmac('sha256','test-secret').update(`timestamp=${options.headers.Timestamp}&order_id=abc`).digest('base64');
        assert.equal(options.headers.Digest,expected);
        assert.equal(options.redirect,'error');
        return {ok:true,json:async()=>({resultcode:'000',data:[]})};
    });
    assert.equal(result.resultcode,'000');
});
test('forged callback or unsigned completion cannot authorize a payment',()=>{
    const body={transid:'t',order_id:'o',reference:'r',result:'SUCCESS',resultcode:'000',payment_status:'COMPLETED'};
    const headers={'signed-fields':Object.keys(body).join(','),'digest-method':'HS256',timestamp:'2026-10-03T13:00:00Z'};
    headers.digest=digest(body,headers.timestamp,credentials.api_secret);
    assert.equal(verifyWebhook(headers,body,credentials),true);
    assert.equal(verifyWebhook(headers,{...body,order_id:'another'},credentials),false);
    assert.equal(verifyWebhook({...headers,'signed-fields':'order_id'},body,credentials),false);
    assert.equal(verifyWebhook(headers,body,{api_secret:'other-tenant'}),false);
});
test('settlement requires COMPLETED status, same order, same amount, and receipt',()=>{
    const order={order_id:'o',amount:'500.00'};
    const data={order_id:'o',amount:'500',payment_status:'COMPLETED',reference:'r'};
    assert.equal(verifiedOrder({resultcode:'000',data:[data]},order),true);
    for(const changes of [{order_id:'other'},{amount:'499'},{payment_status:'PENDING'},{reference:null},{currency:'USD'}]) {
        assert.equal(verifiedOrder({resultcode:'000',data:[{...data,...changes}]},order),false);
    }
});
