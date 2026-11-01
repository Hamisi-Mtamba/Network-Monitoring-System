import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { getCompanyPublicApiUrl } from '../config/api.config';
import { CashPaymentRequest, PaymentInitiationRequest, PaymentInitiationResponse, PaymentStatusResponse } from '../models/payment.model';
import { TenantService } from './tenant.service';
import { WifiContextService } from './wifi-context.service';

@Injectable({providedIn:'root'})
export class PaymentService {
    private readonly http=inject(HttpClient);
    private readonly tenant=inject(TenantService);
    private readonly wifi=inject(WifiContextService);
    initiatePayment(payload:PaymentInitiationRequest) {
        return this.http.post<PaymentInitiationResponse>(`${getCompanyPublicApiUrl(this.tenant.requireSlug())}/payments/initiate`,payload);
    }
    initiateCashPayment(payload:CashPaymentRequest) {
        return this.http.post<PaymentInitiationResponse>(`${getCompanyPublicApiUrl(this.tenant.requireSlug())}/payments/cash-request`,payload);
    }
    // Capture slug explicitly so a tenant switch cannot move a running poll to another company.
    getPaymentStatus(reference:string,slug=this.tenant.requireSlug()) {
        return this.http.get<PaymentStatusResponse>(`${getCompanyPublicApiUrl(slug)}/payments/${encodeURIComponent(reference)}/status`);
    }
    private key(slug:string):string|null {
        const context=this.wifi.get(slug);
        return context ? `nms-pending:${slug}:${context.router}:${context.mac}` : null;
    }
    rememberPending(slug:string,reference:string):void {
        const key=this.key(slug); if(!key)return;
        try {localStorage.setItem(key,reference);} catch { /* Captive browsers may disable storage. */ }
    }
    pending(slug:string):string|null {
        const key=this.key(slug);if(!key)return null;
        try {const reference=localStorage.getItem(key);return reference && reference.length<250 ? reference : null;} catch{return null;}
    }
    clearPending(slug:string,reference:string):void {
        const key=this.key(slug);if(!key)return;
        try {if(localStorage.getItem(key)===reference)localStorage.removeItem(key);} catch { /* Keep server status authoritative. */ }
    }
}
