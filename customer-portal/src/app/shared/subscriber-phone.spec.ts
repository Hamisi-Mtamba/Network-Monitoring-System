import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { EMPTY, of } from 'rxjs';
import { routes } from '../app.routes';
import { PaymentPageComponent } from '../pages/payment/payment';
import { CashPaymentPageComponent } from '../pages/cash-payment/cash-payment';
import { TenantService } from '../services/tenant.service';
import { PackageService } from '../services/package.service';
import { WifiContextService } from '../services/wifi-context.service';
import { convertToParamMap } from '@angular/router';
import { toInternationalPhone } from './subscriber-phone';

const valid = ['712345678', '612345678'];
const invalid = ['0712345678', '0612345678', '255712345678', '+255712345678', '812345678', '71234567', '7123456789', 'abcdefghi', '712 345678', '712-345678'];
const methods = ['lipa', 'cash'] as const;

describe('Subscriber phone payment inputs', () => {
    beforeEach(() => {
        localStorage.clear();
        TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient()] });
        vi.spyOn(TestBed.inject(HttpClient), 'post').mockImplementation(url => url.endsWith('/sessions/reconnect') ? of({ state: 'none' }) : EMPTY);
        const tenant = TestBed.inject(TenantService);
        vi.spyOn(tenant, 'loadCompany').mockImplementation(slug => {
            tenant.setCompanySlug(slug);
            return of({ success: true, company: { id: 1, slug, name: 'ABC Networks' } });
        });
        vi.spyOn(TestBed.inject(PackageService), 'getPackageById').mockReturnValue(of({ id: 1, name: 'Test', price: 100, duration_minutes: 10 }));
        TestBed.inject(WifiContextService).capture('abc-company', convertToParamMap({ mac: 'BA:37:45:61:1A:54', ip: '192.168.88.252', router: 'NMS-LOCAL-ROUTER-001', loginUrl: 'http://wifi.login/login' }));
    });

    async function open(method: typeof methods[number]) {
        const harness = await RouterTestingHarness.create();
        const page = method === 'cash'
            ? await harness.navigateByUrl('/abc-company/cash-payment/1', CashPaymentPageComponent)
            : await harness.navigateByUrl('/abc-company/payment/1', PaymentPageComponent);
        harness.routeDebugElement!.injector.get(ChangeDetectorRef).markForCheck();
        harness.detectChanges();
        const control = page instanceof CashPaymentPageComponent ? page.phoneNumber : page.paymentForm.controls.phoneNumber;
        const submit = () => page instanceof CashPaymentPageComponent ? page.requestCashPayment() : page.initiatePayment();
        return { harness, page, control, submit };
    }

    for (const method of methods) {
        for (const subscriber of valid) {
            it(`${method}: sends ${subscriber} as +255${subscriber}`, async () => {
                const { control, submit, harness } = await open(method);
                const input = harness.routeNativeElement!.querySelector<HTMLInputElement>('.phone-input-wrap input')!;
                expect(input.inputMode).toBe('numeric');
                expect(input.maxLength).toBe(9);
                expect(harness.routeNativeElement!.querySelector('.phone-input-wrap span')?.textContent?.trim()).toBe('+255');
                input.value = subscriber;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                expect(control.valid).toBe(true);
                submit();
                expect(TestBed.inject(HttpClient).post).toHaveBeenCalledWith(
                    expect.stringContaining('/payments/'), expect.objectContaining({ phone_number: `+255${subscriber}` }));
                expect(toInternationalPhone(subscriber)).toBe(`+255${subscriber}`);
            });
        }
        for (const subscriber of invalid) {
            it(`${method}: rejects ${subscriber} without submitting`, async () => {
                const { control, submit } = await open(method);
                control.setValue(subscriber);
                expect(control.invalid).toBe(true);
                submit();
                const calls = vi.mocked(TestBed.inject(HttpClient).post).mock.calls;
                expect(calls.filter(([url]) => url.includes('/payments/'))).toHaveLength(0);
                expect(() => toInternationalPhone(subscriber)).toThrow();
            });
        }
    }

    for (const method of ['lipa', 'cash'] as const) {
        it(`${method}: prevents invalid typing/pastes and permits corrections`, async () => {
            const { harness } = await open(method);
            const input = harness.routeNativeElement!.querySelector<HTMLInputElement>('.phone-input-wrap input')!;
            for (const data of ['0', '2', '8', '+', '-', ' ', 'a']) {
                const event = new InputEvent('beforeinput', { data, inputType: 'insertText', cancelable: true, bubbles: true });
                input.dispatchEvent(event);
                expect(event.defaultPrevented, data).toBe(true);
            }
            for (const value of invalid.filter(value => value !== '71234567')) {
                const event = new Event('paste', { cancelable: true, bubbles: true });
                Object.defineProperty(event, 'clipboardData', { value: { getData: () => value } });
                input.dispatchEvent(event);
                expect(event.defaultPrevented, value).toBe(true);
            }
            input.value = '712345678';
            input.setSelectionRange(0, 1);
            const correction = new InputEvent('beforeinput', { data: '6', inputType: 'insertText', cancelable: true, bubbles: true });
            input.dispatchEvent(correction);
            expect(correction.defaultPrevented).toBe(false);
        });
    }
});
