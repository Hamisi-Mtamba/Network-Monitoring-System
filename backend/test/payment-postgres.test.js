import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {fulfillPayment,runHotspotJob} from '../services/payment-fulfillment.service.js';
import {pool} from '../src/database/database.js';
import {initiatePayment} from '../src/controllers/public/payment.controller.js';
import {getSelcomSettings,updateCompanyPaymentSettings} from '../src/controllers/admin/selcomSettings.controller.js';
import {reconcileSelcomOrder} from '../services/selcom-payment.service.js';
import {changeSessionStatus,queueExpiredSessions} from '../services/session-lifecycle.service.js';
import {createReferencedPayment} from '../services/transaction-reference.service.js';

// Real, isolated PostgreSQL. No project database, router or payment provider is contacted.
test('migration, tenant boundaries, idempotent settlement and retryable router activation',async(t)=>{
    const pg=new PGlite();
    const db={query:(...args)=>pg.query(...args),connect:async()=>({query:(...args)=>pg.query(...args),release(){}})};
    try {
        await pg.exec(`CREATE TABLE companies(id BIGINT PRIMARY KEY,status TEXT,settings JSONB,slug TEXT,name TEXT);
            CREATE TABLE packages(id BIGINT PRIMARY KEY,company_id BIGINT,name TEXT,price NUMERIC,duration_minutes INTEGER,
                is_active BOOLEAN DEFAULT TRUE,available_from TIMESTAMP,available_until TIMESTAMP);
            CREATE TABLE mikrotik_routers(id BIGINT PRIMARY KEY,company_id BIGINT,host TEXT,status TEXT,public_id TEXT);
            CREATE TABLE payments(id BIGSERIAL PRIMARY KEY,company_id BIGINT,package_id BIGINT,phone_number TEXT,
                payment_method TEXT CHECK(payment_method IN ('cash','mpesa','lipa')),amount NUMERIC,transaction_reference TEXT UNIQUE,
                status TEXT,router_id BIGINT,device_mac TEXT,device_ip TEXT,mikrotik_login_url TEXT,created_at TIMESTAMP,paid_at TIMESTAMP);
            CREATE TABLE internet_sessions(id BIGSERIAL PRIMARY KEY,company_id BIGINT,payment_id BIGINT,package_id BIGINT,
                router_id BIGINT,device_mac TEXT,device_ip TEXT,mikrotik_login_url TEXT,started_at TIMESTAMP,expires_at TIMESTAMP,status TEXT,created_at TIMESTAMP);
            INSERT INTO companies(id,status,settings) VALUES(1,'active','{"payment":{"lipa_number":"old"},"branding":{"color":"gold"}}'),(2,'active','{}');
            INSERT INTO packages(id,company_id,name,price,duration_minutes) VALUES(1,1,'One hour',500,60),(2,2,'Other tenant',100,30);
            INSERT INTO mikrotik_routers VALUES(1,1,'10.50.0.2','active','router-1');
            UPDATE companies SET slug='tenant-'||id,name='Tenant '||id;`);
        const migration=await readFile(new URL('../src/database/migrations/002_selcom_payments.sql',import.meta.url),'utf8');
        await pg.exec(migration);await pg.exec(migration);
        assert.deepEqual((await pg.query('SELECT settings FROM companies WHERE id=1')).rows[0].settings,{branding:{color:'gold'}});
        const input={db,companyId:1,packageId:1,routerId:1,paymentMethod:'cash',phoneNumber:'0712345678',
            macAddress:'BA:37:45:61:1A:54',ipAddress:'192.168.88.2',loginUrl:'http://wifi.login/login'};
        const {rows:[payment]}=await createReferencedPayment(input);
        assert.equal(Number(payment.amount),500);
        await assert.rejects(fulfillPayment({companyId:2,reference:payment.transaction_reference,source:'cash'},db),{status:404});
        await assert.rejects(fulfillPayment({companyId:1,reference:payment.transaction_reference,source:'selcom'},db),{status:409});
        const first=await fulfillPayment({companyId:1,reference:payment.transaction_reference,source:'cash',adminId:8},db);
        const second=await fulfillPayment({companyId:1,reference:payment.transaction_reference,source:'cash',adminId:8},db);
        assert.equal(first.session.id,second.session.id);
        assert.equal((await pg.query('SELECT count(*)::int AS n FROM internet_sessions')).rows[0].n,1);
        assert.equal(Number((await pg.query('SELECT confirmed_by_admin_id FROM payments')).rows[0].confirmed_by_admin_id),8);
        await runHotspotJob(first.session.id,{db,provisionAccess:async()=>{throw new Error('offline')},revokeAccess:async()=>{}});
        assert.equal((await pg.query('SELECT status FROM payments')).rows[0].status,'successful');
        let job=(await pg.query('SELECT * FROM hotspot_jobs')).rows[0];
        assert.equal(job.done,false);assert.equal(job.attempts,1);
        const anchor=job.activation_started_at;
        await runHotspotJob(first.session.id,{db,provisionAccess:async options=>{
            assert.equal(options.router.host,'10.50.0.2');
            assert.ok(options.remainingSeconds>3500 && options.remainingSeconds<=3600);
        },revokeAccess:async()=>{assert.fail('Unexpected revoke')}});
        job=(await pg.query('SELECT * FROM hotspot_jobs')).rows[0];
        assert.equal(job.done,true);assert.deepEqual(job.activation_started_at,anchor);
        assert.equal((await pg.query('SELECT status FROM internet_sessions')).rows[0].status,'active');
        assert.equal((await pg.query('SELECT EXTRACT(EPOCH FROM(expires_at-started_at))::int AS seconds FROM internet_sessions')).rows[0].seconds,3600);
        await pg.exec("UPDATE internet_sessions SET status='suspended'; UPDATE hotspot_jobs SET done=FALSE");
        let revoked=0;
        await runHotspotJob(first.session.id,{db,provisionAccess:async()=>assert.fail(),revokeAccess:async()=>{revoked++}});
        assert.equal(revoked,1);
        // Reactivation must retain the original deadline in a non-UTC database timezone.
        await pg.exec("SET TIME ZONE 'Africa/Nairobi'");
        await pg.exec("UPDATE internet_sessions SET expires_at=NOW()+INTERVAL '20 minutes'");
        const before=(await pg.query('SELECT expires_at FROM internet_sessions')).rows[0].expires_at;
        const runJob=id=>runHotspotJob(id,{db,provisionAccess:async options=>{
            assert.ok(options.remainingSeconds>1100 && options.remainingSeconds<=1200);
        },revokeAccess:async()=>{}});
        const activated=await changeSessionStatus(1,first.session.id,'active',{db,runJob});
        assert.equal(activated.status,'active');
        assert.deepEqual((await pg.query('SELECT expires_at FROM internet_sessions')).rows[0].expires_at,before);
        await pg.exec("UPDATE internet_sessions SET expires_at=NOW()-INTERVAL '1 minute'");
        await queueExpiredSessions(db);
        await runHotspotJob(first.session.id,{db,provisionAccess:async()=>assert.fail(),revokeAccess:async()=>{}});
        assert.equal((await pg.query('SELECT status FROM internet_sessions')).rows[0].status,'expired');
        await queueExpiredSessions(db);
        assert.equal((await pg.query('SELECT done FROM hotspot_jobs')).rows[0].done,true);

        // Exercise the actual admin-settings and public-initiation controllers against PostgreSQL.
        t.mock.method(pool,'query',db.query);t.mock.method(pool,'connect',db.connect);
        process.env.PAYMENT_ENCRYPTION_KEY=Buffer.alloc(32,7).toString('base64');
        process.env.PUBLIC_API_URL='https://portal.example.test';
        const response=()=>({code:200,status(n){this.code=n;return this;},json(body){this.body=body;return this;}});
        const settingsResponse=response();
        await updateCompanyPaymentSettings({admin:{role:'admin',companyId:1},body:{payment:{enabled:true,vendor:'TESTVENDOR',
            buyer_email:'billing@example.test',api_key:'secret-key',api_secret:'secret-signing-value'}}},settingsResponse);
        assert.equal(settingsResponse.code,200,JSON.stringify(settingsResponse.body));
        assert.ok(!JSON.stringify(settingsResponse.body).includes('secret-key'));
        const read=response();await getSelcomSettings({admin:{role:'admin',companyId:1}},read);
        assert.equal(read.body.payment.api_key_present,true);assert.equal(read.body.payment.api_key,undefined);
        const requests=[];
        let orderStatus='PENDING',verifiedAmount='500';
        t.mock.method(globalThis,'fetch',async(url,options)=>{
            requests.push({url:String(url),body:options.body ? JSON.parse(options.body) : null});
            if(String(url).includes('order-status'))return {ok:true,json:async()=>({resultcode:'000',data:[{
                order_id:url.searchParams.get('order_id'),amount:verifiedAmount,payment_status:orderStatus,reference:'receipt-1'}]})};
            return {ok:true,json:async()=>({resultcode:'000',data:[]})};
        });
        const req={params:{companySlug:'tenant-1'},body:{package_id:1,payment_method:'selcom',phone_number:'0712345678',
            mac:'BA:37:45:61:1A:55',ip:'192.168.88.2',router:'router-1',loginUrl:'http://wifi.login/login',amount:1}};
        const initiated=response();await initiatePayment(req,initiated);
        assert.equal(initiated.code,201,JSON.stringify(initiated.body));
        assert.equal(Number(initiated.body.payment.amount),500);
        assert.equal(requests.length,2);assert.equal(requests[0].body.amount,500);
        const duplicate=response();await initiatePayment(req,duplicate);
        assert.equal(duplicate.code,409);assert.equal(requests.length,2);
        const order=(await pg.query('SELECT * FROM selcom_orders')).rows[0];
        orderStatus='COMPLETED';verifiedAmount='1';await reconcileSelcomOrder(order.order_id);
        assert.equal((await pg.query('SELECT status FROM payments WHERE id=$1',[order.payment_id])).rows[0].status,'pending');
        await pg.query('UPDATE selcom_orders SET checked_at=NULL');
        verifiedAmount='500';await reconcileSelcomOrder(order.order_id);
        assert.equal((await pg.query('SELECT status FROM payments WHERE id=$1',[order.payment_id])).rows[0].status,'successful');
        await reconcileSelcomOrder(order.order_id);
        assert.equal((await pg.query('SELECT count(*)::int AS n FROM internet_sessions WHERE payment_id=$1',[order.payment_id])).rows[0].n,1);
    } finally {await pg.close();}
});
