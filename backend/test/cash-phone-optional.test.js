import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTransactionReference, createReferencedPayment } from '../services/transaction-reference.service.js';

const identity = {
    paymentMethod: 'cash',
    macAddress: 'BA:37:45:61:1A:54',
    endingTime: '20260908180000'
};

test('cash references support omitted, null, and blank phone numbers', () => {
    for (const phoneNumber of [undefined, null, '', '   ']) {
        assert.equal(generateTransactionReference({ ...identity, phoneNumber }),
            'CASH-BA3745611A54-20260908180000');
    }
});

test('supplied cash numbers are validated and existing references stay compatible', () => {
    assert.equal(generateTransactionReference({ ...identity, phoneNumber: '0712345678' }),
        'CASH-255712345678-BA3745611A54-20260908180000');
    for (const phoneNumber of ['invalid', '123', 123]) {
        assert.throws(() => generateTransactionReference({ ...identity, phoneNumber }),
            /Invalid Tanzanian mobile number/);
    }
});

test('mobile money still requires a phone number and cash still requires a valid device', () => {
    for (const paymentMethod of ['lipa', 'mpesa', 'airtel_money', 'mixx_by_yas', 'halopesa']) {
        assert.throws(() => generateTransactionReference({ ...identity, paymentMethod }),
            /Invalid Tanzanian mobile number/);
    }
    assert.throws(() => generateTransactionReference({ ...identity, macAddress: '' }),
        /Invalid device MAC address/);
});

test('cash without a phone creates an awaiting-confirmation payment', async () => {
    const statements = [];
    const db = { async query(sql, values) {
        statements.push(sql.trim());
        if (sql.includes('FROM packages')) {
            return { rows: [{ price: 100, duration_minutes: 60,
                started_at: '2026-09-08 17:00:00', ending_time: identity.endingTime }] };
        }
        if (sql.includes('INSERT INTO payments')) {
            assert.equal(values[2], '');
            assert.equal(values[3], 'cash');
            assert.equal(values[6], 'awaiting_cash_confirmation');
            return { rows: [{ transaction_reference: values[5] }] };
        }
        return { rows: [] };
    } };
    const result = await createReferencedPayment({ ...identity, db,
        companyId: 1, packageId: 2, routerId: 3,
        ipAddress: '192.168.88.252', loginUrl: 'http://wifi.login/login' });
    assert.equal(result.rows[0].transaction_reference, 'CASH-BA3745611A54-20260908180000');
    assert.equal(statements.at(-1), 'COMMIT');
    assert.ok(!statements.some(sql => sql.includes('UPDATE payments')));
});
