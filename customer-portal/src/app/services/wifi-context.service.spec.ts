import { convertToParamMap } from '@angular/router';
import { WifiContextService } from './wifi-context.service';

const context = { mac: 'ba:37:45:61:1a:54', ip: '192.168.88.252', router: 'NMS-LOCAL-ROUTER-001', loginUrl: 'http://wifi.login/login', originalUrl: 'http://neverssl.com' };

describe('Wi-Fi connection context', () => {
    beforeEach(() => localStorage.clear());

    it('captures a captive entry and survives navigation without query parameters', () => {
        const service = new WifiContextService();
        service.capture('abc-company', convertToParamMap(context));
        for (const page of ['payment', 'cash-payment', 'company', 'packages']) {
            expect(service.capture('abc-company', convertToParamMap({}))?.mac, page).toBe('BA:37:45:61:1A:54');
        }
    });

    it('restores context after a page reload', () => {
        new WifiContextService().capture('abc-company', convertToParamMap(context));
        expect(new WifiContextService().get('abc-company')?.router).toBe(context.router);
    });

    it('replaces old context with a fresh device and router', () => {
        const service = new WifiContextService();
        service.capture('abc-company', convertToParamMap(context));
        service.capture('abc-company', convertToParamMap({ ...context, mac: 'AA:BB:CC:DD:EE:FF', router: 'router-2' }));
        expect(new WifiContextService().get('abc-company')?.mac).toBe('AA:BB:CC:DD:EE:FF');
        expect(service.get('abc-company')?.router).toBe('router-2');
    });

    it('does not reuse context across tenants, including when returning to the old tenant', () => {
        const service = new WifiContextService();
        service.capture('abc-company', convertToParamMap(context));
        expect(service.get('another-company')).toBeNull();
        expect(new WifiContextService().get('abc-company')).toBeNull();
    });

    it('invalidates stale context when a new incomplete captive URL arrives', () => {
        const service = new WifiContextService();
        service.capture('abc-company', convertToParamMap(context));
        expect(service.capture('abc-company', convertToParamMap({ mac: 'AA:BB:CC:DD:EE:FF' }))).toBeNull();
        expect(new WifiContextService().get('abc-company')).toBeNull();
    });

    it('rejects malformed stored data and invalid connection values', () => {
        localStorage.setItem('nms_wifi_connection_context', '{broken');
        const service = new WifiContextService();
        expect(service.get('abc-company')).toBeNull();
        for (const changes of [{ mac: 'invalid' }, { ip: '999.1.1.1' }, { loginUrl: 'javascript:alert(1)' }]) {
            expect(service.capture('abc-company', convertToParamMap({ ...context, ...changes }))).toBeNull();
        }
    });
});
