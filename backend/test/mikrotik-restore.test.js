import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import { EventEmitter } from 'node:events';
import { restoreHotspotAccess } from '../services/mikrotik.service.js';

const mac = 'BA:37:45:61:1A:54';
const router = { host: '192.168.88.1', public_id: 'NMS-LOCAL-ROUTER-001' };

function mockRest(t, { verified = true, active = [] } = {}) {
    const oldUsername = process.env.MIKROTIK_USERNAME;
    const oldPassword = process.env.MIKROTIK_PASSWORD;
    process.env.MIKROTIK_USERNAME = 'test';
    process.env.MIKROTIK_PASSWORD = 'test';
    t.after(() => {
        for (const [key, value] of [['MIKROTIK_USERNAME', oldUsername], ['MIKROTIK_PASSWORD', oldPassword]]) {
            if (value === undefined) delete process.env[key]; else process.env[key] = value;
        }
    });
    const calls = [];
    t.mock.method(https, 'request', (options, callback) => {
        const call = { path: options.path, method: options.method };
        calls.push(call);
        const request = new EventEmitter();
        request.setTimeout = () => request;
        request.write = body => { call.body = JSON.parse(body); };
        request.end = () => queueMicrotask(() => {
            let body = {};
            if (options.method === 'GET') {
                if (options.path.endsWith('/host')) body = verified ? [{ '.id': '*1', 'mac-address': mac, address: '192.168.88.252' }] : [];
                if (options.path.endsWith('/active')) body = active;
                if (options.path.endsWith('/user')) body = [{ '.id': '*2', name: mac }];
            }
            const response = new EventEmitter();
            response.statusCode = 200;
            callback(response);
            response.emit('data', JSON.stringify(body));
            response.emit('end');
        });
        return request;
    });
    return calls;
}

test('restoration creates only remaining seconds and clears the stale host', async t => {
    const calls = mockRest(t);
    await restoreHotspotAccess({ router, macAddress: mac, ipAddress: '192.168.88.252', getRemainingSeconds: async () => 61 });
    const create = calls.find(call => call.method === 'PUT');
    assert.equal(create.body['limit-uptime'], '61s');
    assert.equal(create.body.name, mac);
    assert.equal(create.body['mac-address'], mac);
    assert.equal(create.body['rate-limit'], undefined);
    assert.ok(calls.some(call => call.method === 'DELETE' && call.path.includes('/host/')));
});

test('already correctly timed MAC connection is not recreated', async t => {
    const calls = mockRest(t, { active: [{ 'mac-address': mac, user: mac, 'session-time-left': '60s' }] });
    const result = await restoreHotspotAccess({ router, macAddress: mac, ipAddress: '192.168.88.252', getRemainingSeconds: async () => 61 });
    assert.equal(result.restored, false);
    assert.ok(calls.every(call => call.method === 'GET'));
});

test('unverified MAC/IP is rejected without router mutations', async t => {
    const calls = mockRest(t, { verified: false });
    await assert.rejects(restoreHotspotAccess({ router, macAddress: mac, ipAddress: '192.168.88.252', getRemainingSeconds: async () => 61 }), /verified/);
    assert.ok(calls.every(call => call.method === 'GET'));
});
