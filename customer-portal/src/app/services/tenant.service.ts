import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap, timer, fromEvent, merge, filter, exhaustMap, catchError, EMPTY } from 'rxjs';
import { Company, CompanyResponse } from '../models/company.model';
import { getCompanyPublicApiUrl } from '../config/api.config';
import { applyCompanyBranding } from '../../../../shared/company-branding';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
@Injectable({providedIn:'root'})
export class TenantService {
    private readonly slugState=signal<string|null>(null);
    private readonly companyState=signal<Company|null>(null);
    readonly companySlug=this.slugState.asReadonly();
    readonly company=this.companyState.asReadonly();
    constructor(private readonly http:HttpClient){
        applyCompanyBranding();
        merge(timer(30000,30000),fromEvent(window,'focus')).pipe(
            filter(()=>!!this.companyState() && document.visibilityState==='visible'),
            exhaustMap(()=>this.loadCompany(this.requireSlug()).pipe(catchError(()=>EMPTY))),
            takeUntilDestroyed(inject(DestroyRef)),
        ).subscribe();
    }
    setCompanySlug(slug:string):void {
        const normalized=slug.trim().toLowerCase();
        if(normalized!==this.slugState()) {this.companyState.set(null);this.applyBranding();}
        this.slugState.set(normalized);
    }
    loadCompany(slug:string) {
        this.setCompanySlug(slug);const normalized=this.requireSlug();
        return this.http.get<CompanyResponse>(getCompanyPublicApiUrl(normalized)).pipe(tap(response=>{
            // Ignore responses from a company the visitor has already left.
            if(this.slugState()!==normalized || response.company?.slug!==normalized)return;
            this.companyState.set(response.company);this.applyBranding(response.company);
        }));
    }
    requireSlug():string {const slug=this.slugState();if(!slug)throw new Error('Company is unavailable');return slug;}
    private applyBranding(company?:Company):void {
        applyCompanyBranding(company?.settings?.branding);
    }
}
