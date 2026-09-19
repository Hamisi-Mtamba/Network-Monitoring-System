import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTransactionReference, createReferencedPayment } from '../services/transaction-reference.service.js';

const identity = { phoneNumber: '+255712345678', macAddress: 'BA:37:45:61:1A:54', endingTime: '20260908180000' };
for (const [method, prefix] of Object.entries({ mpesa: 'MPESA', airtel_money: 'AIRTELMONEY', mixx_by_yas: 'MIXX', halopesa: 'HALOPESA', cash: 'CASH' })) {
    test(`${method} produces the exact required reference`, () => {
        assert.equal(generateTransactionReference({ ...identity, paymentMethod: method }), `${prefix}-255712345678-BA3745611A54-20260908180000`);
    });
}
test('normalizes hyphens, spaces, lowercase MAC and local phone numbers', () => {
    assert.equal(generateTransactionReference({ ...identity, paymentMethod: ' MPESA ', phoneNumber: '0712345678', macAddress: 'ba-37 45:61-1a 54' }), 'MPESA-255712345678-BA3745611A54-20260908180000');
});
test('rejects malformed identity and ending time', () => {
    for (const changes of [{ paymentMethod: 'unknown' }, { phoneNumber: '+255BAD' }, { macAddress: 'invalid' }, { endingTime: '20260230180000' }, { endingTime: '202609081800' }]) {
        assert.throws(() => generateTransactionReference({ ...identity, paymentMethod: 'mpesa', ...changes }));
    }
});

const input = { companyId: 1, packageId: 2, routerId: 3, paymentMethod: 'mpesa', ...identity,
    ipAddress: '192.168.88.252', loginUrl: 'http://wifi.login/login' };
test('retries a uniqueness conflict using a fresh DB timestamp, without a suffix', async () => {
    let attempts = 0;
    const inserts = [];
    const db = { async query(sql, values) {
        if (sql.includes('FROM packages')) return { rows: [{ price: 100, duration_minutes: 60, started_at: `2026-09-08 17:00:0${attempts}`, ending_time: `2026090818000${attempts++}` }] };
        inserts.push(values);
        assert.match(sql, /ON CONFLICT \(transaction_reference\) DO NOTHING/);
        return { rows: inserts.length === 1 ? [] : [{ transaction_reference: values[5] }] };
    } };
    const waits = [];
    const result = await createReferencedPayment({ ...input, db }, { wait: async ms => waits.push(ms) });
    assert.equal(result.rows[0].transaction_reference, 'MPESA-255712345678-BA3745611A54-20260908180001');
    assert.deepEqual(waits, [1000]);
    assert.equal(inserts[1][4], 100);
    assert.equal(inserts[1][8], 'BA:37:45:61:1A:54');
});
test('bounded repeated collisions return a clear conflict instead of duplicate payment', async () => {
    let inserts = 0;
    const db = { async query(sql) {
        if (sql.includes('FROM packages')) return { rows: [{ price: 100, duration_minutes: 60, started_at: '2026-09-08 17:00:00', ending_time: identity.endingTime }] };
        inserts++; return { rows: [] };
    } };
    await assert.rejects(createReferencedPayment({ ...input, db }, { wait: async () => {} }), { status: 409 });
    assert.equal(inserts, 5);
});
test('unrelated DB failures are propagated without a collision retry', async () => {
    const db = { async query() { throw new Error('connection lost'); } };
    await assert.rejects(createReferencedPayment({ ...input, db }, { wait: () => assert.fail() }), /connection lost/);
});
