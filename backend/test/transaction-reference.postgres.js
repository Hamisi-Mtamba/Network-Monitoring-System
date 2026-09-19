// Explicit integration check: writes test payments in a transaction and rolls
// them back. Does not confirm payments, charge customers or contact MikroTik.
import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/database/database.js';
import { initiatePayment, createCashPaymentRequest } from '../src/controllers/public/payment.controller.js';
import { createReferencedPayment } from '../services/transaction-reference.service.js';

test('real initiation controllers store all five formats using trusted PostgreSQL duration and price', async t => {
    const client = await pool.connect();
    const originalQuery = pool.query.bind(pool);
    try {
        await client.query('BEGIN');
        const fixture = (await client.query(`
            SELECT c.slug, c.id AS company_id, p.id AS package_id, p.price,
                r.public_id FROM companies c
            JOIN packages p ON p.company_id = c.id
            JOIN mikrotik_routers r ON r.company_id = c.id
            WHERE c.status = 'active' AND p.is_active = TRUE AND r.status = 'active'
              AND p.duration_minutes > 0
              AND (p.available_from IS NULL OR p.available_from <= CURRENT_TIMESTAMP)
              AND (p.available_until IS NULL OR p.available_until >= CURRENT_TIMESTAMP)
            ORDER BY c.id, p.id LIMIT 1
        `)).rows[0];
        assert.ok(fixture, 'An active company/package/router is required');
        t.mock.method(pool, 'query', (...args) => client.query(...args));
        const ids = [];
        for (const [method, prefix] of Object.entries({ mpesa: 'MPESA', airtel_money: 'AIRTELMONEY', mixx_by_yas: 'MIXX', halopesa: 'HALOPESA', cash: 'CASH' })) {
            for (const subscriber of ['712345678', '612345678']) {
            let code; let body;
            const res = { status(value) { code = value; return this; }, json(value) { body = value; return this; } };
            const req = { params: { companySlug: fixture.slug }, body: {
                package_id: fixture.package_id, payment_method: method, phone_number: `+255${subscriber}`,
                mac: 'BA:37:45:61:1A:54', ip: '192.168.88.252', router: fixture.public_id,
                login_url: 'http://wifi.login/login', price: 1, amount: 1, duration_minutes: 999999,
                ending_time: '19000101000000', transaction_reference: 'FRONTEND-FORGED'
            } };
            await (method === 'cash' ? createCashPaymentRequest : initiatePayment)(req, res);
            assert.equal(code, 201, JSON.stringify(body));
            assert.match(body.payment.transaction_reference, new RegExp(`^${prefix}-255${subscriber}-BA3745611A54-\\d{14}$`));
            assert.equal(Number(body.payment.amount), Number(fixture.price));
            assert.equal(body.payment.status, method === 'cash' ? 'awaiting_cash_confirmation' : 'pending');
            assert.equal(body.payment.phone_number, `+255${subscriber}`);
            ids.push(body.payment.id);
            }
        }
        const validation = await client.query(`
            SELECT pay.id, pay.transaction_reference,
              to_char(pay.created_at + p.duration_minutes * INTERVAL '1 minute', 'YYYYMMDDHH24MISS') AS expected_ending
            FROM payments pay JOIN packages p ON p.id = pay.package_id AND p.company_id = pay.company_id
            WHERE pay.id = ANY($1::int[])
        `, [ids]);
        assert.equal(validation.rows.length, 10);
        for (const row of validation.rows) assert.ok(row.transaction_reference.endsWith(`-${row.expected_ending}`));
        // User-requested inspection, performed after inserting the five payments.
        const stored = await client.query(`SELECT id, payment_method, phone_number, device_mac,
            transaction_reference, created_at FROM payments ORDER BY id DESC LIMIT 5`);
        console.log(JSON.stringify(stored.rows, null, 2));
        const constraint = await client.query("SELECT 1 FROM pg_constraint WHERE conrelid='payments'::regclass AND conname='payments_transaction_reference_key' AND contype='u'");
        assert.equal(constraint.rows.length, 1);

        // Force an actual UNIQUE collision with the first inserted reference.
        // The retry must retain the format and use a fresh database timestamp.
        const previousTiming = (await client.query(`
            SELECT p.price, p.duration_minutes,
                to_char(pay.created_at, 'YYYY-MM-DD HH24:MI:SS.US') AS started_at,
                split_part(pay.transaction_reference, '-', 4) AS ending_time
            FROM payments pay JOIN packages p ON p.id = pay.package_id
            WHERE pay.id = $1
        `, [ids[0]])).rows[0];
        let forceCollision = true;
        const retryDb = { async query(sql, args) {
            if (forceCollision && sql.includes('WITH moment')) {
                forceCollision = false;
                return { rows: [previousTiming] };
            }
            return client.query(sql, args);
        } };
        const retried = await createReferencedPayment({ db: retryDb, companyId: fixture.company_id,
            packageId: fixture.package_id, routerId: (await client.query('SELECT router_id FROM payments WHERE id=$1', [ids[0]])).rows[0].router_id,
            paymentMethod: 'mpesa', phoneNumber: '+255712345678', macAddress: 'BA:37:45:61:1A:54',
            ipAddress: '192.168.88.252', loginUrl: 'http://wifi.login/login' });
        assert.match(retried.rows[0].transaction_reference, /^MPESA-255712345678-BA3745611A54-\d{14}$/);
        assert.notEqual(retried.rows[0].transaction_reference, validation.rows.find(row => row.id === ids[0]).transaction_reference);
        console.log('Actual PostgreSQL UNIQUE collision retried successfully without a suffix.');
    } finally {
        pool.query = originalQuery;
        await client.query('ROLLBACK');
        client.release();
        await pool.end();
    }
});
