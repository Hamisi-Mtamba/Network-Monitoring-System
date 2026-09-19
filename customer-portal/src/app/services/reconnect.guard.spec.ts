import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { ActivatedRouteSnapshot, convertToParamMap, provideRouter, Router, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, isObservable, of, throwError } from 'rxjs';
import { reconnectBeforePurchase } from './reconnect.guard';

describe('Reconnect before purchase', () => {
    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient()] });
    });
    async function check(response: object | Error, withContext = true) {
        const post = vi.spyOn(TestBed.inject(HttpClient), 'post').mockReturnValue(
            response instanceof Error ? throwError(() => response) : of(response));
        const route = {
            paramMap: convertToParamMap({ companySlug: 'abc-company' }),
            queryParamMap: convertToParamMap(withContext ? { mac: 'BA:37:45:61:1A:54', ip: '192.168.88.252', router: 'NMS-LOCAL-ROUTER-001', loginUrl: 'http://wifi.login/login' } : {})
        } as ActivatedRouteSnapshot;
        const output = TestBed.runInInjectionContext(() => reconnectBeforePurchase(route, {} as RouterStateSnapshot));
        const result = isObservable(output) ? await firstValueFrom(output) : await output;
        return { result: typeof result === 'boolean' ? result : TestBed.inject(Router).serializeUrl(result as any), post };
    }
    it('sends a paid device to its existing session', async () => {
        expect((await check({ state: 'active', session: { id: 42 } })).result).toBe('/abc-company/session/42');
    });
    it('allows unpaid devices to choose a package', async () => {
        expect((await check({ state: 'none' })).result).toBe(true);
    });
    it('blocks checkout on router/backend errors', async () => {
        expect((await check(new Error('offline'))).result).toBe('/abc-company/connection-check');
    });
    it('keeps suspended devices out of checkout', async () => {
        expect((await check({ state: 'suspended' })).result).toBe('/abc-company/connection-check?suspended=1');
    });
    it('allows browsing without context but does not request restoration', async () => {
        const { result, post } = await check({ state: 'none' }, false);
        expect(result).toBe(true);
        expect(post).not.toHaveBeenCalled();
    });
});
