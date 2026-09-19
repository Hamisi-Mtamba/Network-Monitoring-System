import test from 'node:test';
import assert from 'node:assert/strict';
import { reconnectSession } from '../services/session-reconnect.service.js';
import { formatRemainingDuration, assertConfiguredRouter, parseRouterDuration } from '../services/mikrotik.service.js';

const input = { companySlug: 'abc-company', mac: 'ba:37:45:61:1a:54', ip: '192.168.88.252', router: 'NMS-LOCAL-ROUTER-001' };
function database({ mapping = true, active = true, suspended = false, remaining = 25200 } = {}) {
    const calls = [];
    let released = false;
    return {
        calls, get released() { return released; },
        async connect() {
            return {
                async query(sql, values) {
                    calls.push({ sql, values });
                    if (sql.includes('FROM mikrotik_routers')) return { rows: mapping ? [{ id: 7, company_id: 3, host: '192.168.88.1', public_id: input.router }] : [] };
                    if (sql.includes('FOR UPDATE')) return { rows: active ? [{ id: 42, status: 'active', expires_at: '2026-09-07T20:00:00' }] : [] };
                    if (sql.includes('AS remaining_seconds')) return { rows: [{ remaining_seconds: remaining }] };
                    if (sql.includes("status = 'suspended'")) return { rows: suspended ? [{ id: 42 }] : [] };
                    return { rows: [] };
                },
                release() { released = true; }
            };
        }
    };
}

test('reconnect restores seven hours remaining without resetting expiry or creating a purchase', async () => {
    const pool = database();
    let restores = 0;
    const result = await reconnectSession({ pool, restoreAccess: async options => {
        restores++;
        assert.equal(options.router.company_id, 3);
        assert.equal(await options.getRemainingSeconds(), 25200);
        return { restored: true, remainingSeconds: 25200 };
    } }, input);
    assert.equal(result.session.id, 42);
    assert.equal(result.session.expires_at, '2026-09-07T20:00:00');
    assert.equal(restores, 1);
    assert.equal(pool.calls.some(call => /INSERT|SET expires_at/i.test(call.sql)), false);
    assert.deepEqual(pool.calls.find(call => call.sql.includes('FOR UPDATE')).values, [3, 7, input.mac.toUpperCase()]);
    assert.equal(pool.released, true);
});

test('another tenant router is rejected before contacting MikroTik', async () => {
    const pool = database({ mapping: false });
    await assert.rejects(reconnectSession({ pool, restoreAccess: () => assert.fail('Unexpected router access') }, input), { status: 404 });
    assert.equal(pool.calls.at(-1).sql, 'ROLLBACK');
});

test('expired or missing session returns purchasing flow and updates stale active rows', async () => {
    const pool = database({ active: false });
    const result = await reconnectSession({ pool, restoreAccess: () => assert.fail('Unexpected router access') }, input);
    assert.equal(result.state, 'none');
    assert.ok(pool.calls.some(call => call.sql.includes('expires_at <= CURRENT_TIMESTAMP')));
});

test('suspended purchases cannot be restored by customers', async () => {
    const result = await reconnectSession({ pool: database({ active: false, suspended: true }), restoreAccess: () => assert.fail() }, input);
    assert.equal(result.state, 'suspended');
});

test('zero remaining time cannot create unlimited RouterOS access', async () => {
    const result = await reconnectSession({ pool: database({ remaining: 0 }), restoreAccess: () => assert.fail() }, input);
    assert.equal(result.state, 'none');
    assert.throws(() => formatRemainingDuration(0));
    assert.throws(() => formatRemainingDuration(-1));
    assert.throws(() => formatRemainingDuration(1.5));
    assert.equal(formatRemainingDuration(61), '61s');
});

test('router failure rolls back and releases the connection instead of returning unpaid', async () => {
    const pool = database();
    await assert.rejects(reconnectSession({ pool, restoreAccess: async () => { throw new Error('offline'); } }, input), /offline/);
    assert.equal(pool.calls.at(-1).sql, 'ROLLBACK');
    assert.equal(pool.released, true);
});

test('invalid device identity fails before acquiring a DB connection', async () => {
    await assert.rejects(reconnectSession({ pool: { connect: () => assert.fail() } }, { ...input, mac: 'invalid' }), { status: 400 });
});

test('fixed REST target refuses an unrelated router mapping', () => {
    assert.throws(() => assertConfiguredRouter({ host: '192.168.88.1', public_id: 'OTHER-TENANT' }));
    assert.throws(() => assertConfiguredRouter({ host: '192.168.99.1', public_id: input.router }));
    assert.equal(parseRouterDuration('1d2h3m4s'), 93784);
    assert.equal(parseRouterDuration(''), null);
    assert.equal(parseRouterDuration(undefined), null);
});
