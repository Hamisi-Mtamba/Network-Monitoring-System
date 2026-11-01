import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, Subscription, catchError, exhaustMap, timer, timeout } from 'rxjs';
import { PaymentService } from '../../services/payment.service';
import { TenantService } from '../../services/tenant.service';
import { WifiContextService } from '../../services/wifi-context.service';
import { PaymentStatusResponse } from '../../models/payment.model';
import { browsingUrl, paymentView } from '../../shared/payment-state';
@Component({selector:'app-payment-status',standalone:true,imports:[RouterLink,DatePipe,DecimalPipe],
    templateUrl:'./payment-status.html',styleUrl:'./payment-status.css'})
export class PaymentStatusPageComponent implements OnInit {
    private readonly route=inject(ActivatedRoute);
    private readonly payments=inject(PaymentService);
    private readonly wifi=inject(WifiContextService);
    private readonly destroy=inject(DestroyRef);
    readonly tenantService=inject(TenantService);
    readonly slug=this.route.snapshot.paramMap.get('companySlug') || '';
    readonly reference=this.route.snapshot.paramMap.get('reference') || '';
    readonly response=signal<PaymentStatusResponse|null>(null);
    readonly view=computed(()=>this.response()?paymentView(this.response()!):null);
    readonly loading=signal(true);
    readonly error=signal('');
    readonly paused=signal(false);
    private poll?:Subscription;
    readonly headings={pending:'Approve on your phone.',cash:'One last step.',activating:'Getting you connected.',
        active:'You’re connected.',suspended:'Your access is paused.',expired:'Your time is complete.',failed:'Payment not completed.'};
    ngOnInit():void {
        this.destroy.onDestroy(()=>this.poll?.unsubscribe());
        if(!this.slug||!this.reference){this.loading.set(false);this.error.set('This payment link is incomplete.');return;}
        this.tenantService.loadCompany(this.slug).pipe(takeUntilDestroyed(this.destroy)).subscribe({error:()=>{}});
        this.checkAgain();
    }
    checkAgain():void {
        this.poll?.unsubscribe();this.paused.set(false);this.error.set('');
        const deadline=Date.now()+10*60_000;
        this.poll=timer(0,4000).pipe(exhaustMap(()=>this.payments.getPaymentStatus(this.reference,this.slug).pipe(
            timeout(15000),catchError(error=>{
                this.loading.set(false);
                if(error.status===404)this.payments.clearPending(this.slug,this.reference);
                this.error.set(error.status===404?'This payment could not be found. Contact your Wi-Fi provider if you have paid.':
                    'We couldn’t check your payment. Keep this page open, or check again.');
                if(error.status===404||Date.now()>deadline){this.paused.set(true);this.poll?.unsubscribe();}
                return EMPTY;
            }))),takeUntilDestroyed(this.destroy)).subscribe(result=>{
                this.loading.set(false);this.error.set('');this.response.set(result);
                const state=paymentView(result);
                if(['active','expired','failed'].includes(state))this.payments.clearPending(this.slug,this.reference);
                if(['active','suspended','expired','failed'].includes(state)){this.poll?.unsubscribe();return;}
                if(Date.now()>deadline){this.paused.set(true);this.poll?.unsubscribe();}
            });
    }
    continueBrowsing():void {
        // Recheck server state before leaving; cached success is never sufficient.
        this.payments.getPaymentStatus(this.reference,this.slug).pipe(timeout(15000),takeUntilDestroyed(this.destroy)).subscribe({next:result=>{
            this.response.set(result);
            if(paymentView(result)==='active')window.location.assign(browsingUrl(this.wifi.get(this.slug)?.originalUrl));
        },error:()=>this.error.set('Please check your connection and try again.')});
    }
}
