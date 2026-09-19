import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { EMPTY, of } from 'rxjs';
import { PaymentPageComponent } from '../payment/payment';
import { CashPaymentPageComponent } from '../cash-payment/cash-payment';
import { PaymentService } from '../../services/payment.service';
import { PackagesPageComponent } from './packages';
import { PackageService } from '../../services/package.service';
import { TenantService } from '../../services/tenant.service';
import { WifiContextService } from '../../services/wifi-context.service';
import { routes } from '../../app.routes';

const captive = '?mac=BA:37:45:61:1A:54&ip=192.168.88.252&router=NMS-LOCAL-ROUTER-001&loginUrl=http%3A%2F%2Fwifi.login%2Flogin';

describe('Customer Wi-Fi navigation', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient()] });
    vi.spyOn(TestBed.inject(HttpClient), 'post').mockReturnValue(of({ state: 'none' }));
    const tenant = TestBed.inject(TenantService);
    vi.spyOn(tenant, 'loadCompany').mockImplementation(slug => {
      tenant.setCompanySlug(slug);
      return of({ success: true, company: { id: 1, slug, name: 'ABC Networks' } });
    });
    vi.spyOn(TestBed.inject(PackageService), 'getPackages').mockReturnValue(of([]));
    vi.spyOn(TestBed.inject(PackageService), 'getPackageById').mockReturnValue(of({ id: 1, name: 'Test', price: 100, duration_minutes: 10 }));
  });
  it('captures at tenant entry, then retains context through payment, cash and back navigation', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/abc-company' + captive, PackagesPageComponent);
    const wifi = TestBed.inject(WifiContextService);
    expect(wifi.get('abc-company')?.mac).toBe('BA:37:45:61:1A:54');
    for (const path of ['payment/1', 'cash-payment/1', 'company', 'packages', 'payment/1']) {
      await harness.navigateByUrl('/abc-company/' + path);
      expect(wifi.get('abc-company')?.router).toBe('NMS-LOCAL-ROUTER-001');
    }
    expect(new WifiContextService().get('abc-company')?.ip).toBe('192.168.88.252');
    await harness.navigateByUrl('/another-company/packages');
    expect(wifi.get('another-company')).toBeNull();
  });

  it('submits both payment methods with stored Wi-Fi context when URLs contain no query parameters', async () => {
    const payments = TestBed.inject(PaymentService);
    const mobile = vi.spyOn(payments, 'initiatePayment').mockReturnValue(EMPTY);
    const cash = vi.spyOn(payments, 'initiateCashPayment').mockReturnValue(EMPTY);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/abc-company/packages' + captive);
    const payment = await harness.navigateByUrl('/abc-company/payment/1', PaymentPageComponent);
    payment.paymentForm.setValue({ phoneNumber: '712345678' });
    payment.initiatePayment();
    const expected = { mac: 'BA:37:45:61:1A:54', ip: '192.168.88.252', router: 'NMS-LOCAL-ROUTER-001', login_url: 'http://wifi.login/login' };
    expect(mobile).toHaveBeenCalledWith(expect.objectContaining(expected));
    const cashPage = await harness.navigateByUrl('/abc-company/cash-payment/1', CashPaymentPageComponent);
    cashPage.phoneNumber.setValue('712345678');
    cashPage.requestCashPayment();
    expect(cash).toHaveBeenCalledWith(expect.objectContaining(expected));
  });
});
