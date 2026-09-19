import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTanzanianPhone, parsePaymentSms } from '../services/payment-sms-parser.service.js';

test('normalizes Tanzanian payer numbers', () => {
    assert.equal(normalizeTanzanianPhone('0712345678'), '255712345678');
    assert.equal(normalizeTanzanianPhone('+255712345678'), '255712345678');
});

test('parses labelled transaction, amount and payer phone safely', () => {
    const result = parsePaymentSms({
        sender: 'M-PESA',
        message: 'You have received TZS 2,000 from 0712345678. Transaction ID: ABC123XYZ.'
    });
    assert.equal(result.provider, 'mpesa');
    assert.equal(result.amount, 2000);
    assert.equal(result.payerPhone, '255712345678');
    assert.equal(result.providerTransactionId, 'ABC123XYZ');
    assert.equal(result.complete, true);
});

test('incomplete SMS is never considered safe for automatic approval', () => {
    const result = parsePaymentSms({ sender: 'M-PESA', message: 'You have received TZS 2,000.' });
    assert.equal(result.complete, false);
    assert.ok(result.missing.includes('transaction_id'));
    assert.ok(result.missing.includes('payer_phone'));
});
