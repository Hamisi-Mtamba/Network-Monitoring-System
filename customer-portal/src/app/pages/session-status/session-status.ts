import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, catchError, exhaustMap, timer, timeout } from 'rxjs';
import { TenantService } from '../../services/tenant.service';
import { SessionService } from '../../services/session.service';
import { WifiContextService } from '../../services/wifi-context.service';
import { InternetSession } from '../../models/session.model';
import { browsingUrl } from '../../shared/payment-state';
@Component({selector:'app-session-status-page',standalone:true,imports:[RouterLink,DatePipe],templateUrl:'./session-status.html',styleUrl:'./session-status.css'})
export class SessionStatusPageComponent implements OnInit {
    readonly tenantService=inject(TenantService);
    private readonly sessions=inject(SessionService);
    private readonly wifi=inject(WifiContextService);
    private readonly route=inject(ActivatedRoute);
    private readonly destroy=inject(DestroyRef);
    readonly slug=this.route.snapshot.paramMap.get('companySlug') || '';
    readonly id=Number(this.route.snapshot.paramMap.get('id'));
    readonly session=signal<InternetSession|null>(null);
    readonly error=signal('');readonly loading=signal(true);readonly now=signal(Date.now());
    readonly state=computed(()=>{
        const session=this.session();if(!session)return 'loading';
        if(session.status==='active' && Date.parse(session.expires_at)<=this.now())return 'expired';
        return session.status;
    });
    readonly remainingTime=computed(()=>{
        const value=this.session();if(!value||this.state()!=='active')return '—';
        const seconds=Math.max(0,Math.floor((Date.parse(value.expires_at)-this.now())/1000));
        if(!Number.isFinite(seconds))return '—';
        const hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60);
        return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
    });
    ngOnInit():void {
        if(!this.slug||!Number.isSafeInteger(this.id)||this.id<=0){this.error.set('This session link is invalid.');this.loading.set(false);return;}
        this.tenantService.loadCompany(this.slug).pipe(takeUntilDestroyed(this.destroy)).subscribe({error:()=>{}});
        timer(0,1000).pipe(takeUntilDestroyed(this.destroy)).subscribe(()=>this.now.set(Date.now()));
        timer(0,15000).pipe(exhaustMap(()=>this.sessions.getSession(this.slug,this.id).pipe(timeout(15000),catchError(()=>{
            this.loading.set(false);this.error.set('We couldn’t refresh your session. Please check your connection.');return EMPTY;
        }))),takeUntilDestroyed(this.destroy)).subscribe(result=>{this.session.set(result);this.loading.set(false);this.error.set('');});
    }
    continueBrowsing():void {
        this.sessions.getSession(this.slug,this.id).pipe(timeout(15000),takeUntilDestroyed(this.destroy)).subscribe({next:session=>{
            this.session.set(session);
            if(session.status==='active'&&Date.parse(session.expires_at)>Date.now())window.location.assign(browsingUrl(this.wifi.get(this.slug)?.originalUrl));
        },error:()=>this.error.set('Please check your connection and try again.')});
    }
}
