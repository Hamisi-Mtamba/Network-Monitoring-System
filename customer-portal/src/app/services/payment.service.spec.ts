import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting,HttpTestingController } from '@angular/common/http/testing';
import { convertToParamMap } from '@angular/router';
import { PaymentService } from './payment.service';
import { TenantService } from './tenant.service';
import { WifiContextService } from './wifi-context.service';
describe('Tenant-scoped payment recovery',()=>{
    beforeEach(()=>{localStorage.clear();TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting()]});});
    it('keeps a pending reference scoped to company, router and device',()=>{
        const payments=TestBed.inject(PaymentService),wifi=TestBed.inject(WifiContextService);
        const fields={mac:'BA:37:45:61:1A:54',ip:'192.168.88.2',router:'one',loginUrl:'http://wifi.login/login'};
        wifi.capture('alpha',convertToParamMap(fields));payments.rememberPending('alpha','ref');
        expect(payments.pending('alpha')).toBe('ref');
        wifi.capture('alpha',convertToParamMap({...fields,router:'two'}));expect(payments.pending('alpha')).toBeNull();
        wifi.capture('beta',convertToParamMap(fields));expect(payments.pending('beta')).toBeNull();
        wifi.capture('alpha',convertToParamMap(fields));payments.clearPending('alpha','other');expect(payments.pending('alpha')).toBe('ref');
        payments.clearPending('alpha','ref');expect(payments.pending('alpha')).toBeNull();
    });
    it('a poll keeps its explicit company even if the current tenant changes',()=>{
        TestBed.inject(TenantService).setCompanySlug('beta');
        TestBed.inject(PaymentService).getPaymentStatus('reference','alpha').subscribe();
        const http=TestBed.inject(HttpTestingController);http.expectOne('/api/public/companies/alpha/payments/reference/status').flush({});http.verify();
    });
});
