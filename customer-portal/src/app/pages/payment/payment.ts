import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { switchMap, timeout } from 'rxjs';
import { InternetPackage } from '../../models/package.model';
import { TenantService } from '../../services/tenant.service';
import { PackageService } from '../../services/package.service';
import { PaymentService } from '../../services/payment.service';
import { WifiContextService } from '../../services/wifi-context.service';
import { SUBSCRIBER_PHONE_PATTERN, toInternationalPhone } from '../../shared/subscriber-phone';
import { SubscriberPhoneDirective } from '../../shared/subscriber-phone.directive';
@Component({selector:'app-payment-page',standalone:true,imports:[RouterLink,ReactiveFormsModule,SubscriberPhoneDirective,DecimalPipe],
    templateUrl:'./payment.html',styleUrl:'./payment.css'})
export class PaymentPageComponent implements OnInit {
    protected readonly route=inject(ActivatedRoute);
    protected readonly router=inject(Router);
    protected readonly destroyRef=inject(DestroyRef);
    readonly tenantService=inject(TenantService);
    readonly packageService=inject(PackageService);
    protected readonly paymentService=inject(PaymentService);
    protected readonly wifiContextService=inject(WifiContextService);
    readonly packageItem=signal<InternetPackage|null>(null);
    readonly loadingPackage=signal(true);
    readonly submitting=signal(false);
    readonly errorMessage=signal('');
    readonly uncertain=signal(false);
    readonly cashMode=this.route.snapshot.routeConfig?.path?.includes('cash-payment/') ?? false;
    readonly paymentForm=new FormGroup({phoneNumber:new FormControl('',{nonNullable:true,validators:[
        ...(this.cashMode?[]:[Validators.required]),Validators.pattern(SUBSCRIBER_PHONE_PATTERN)]})});
    readonly phoneNumber=this.paymentForm.controls.phoneNumber;
    ngOnInit():void {
        const slug=this.route.snapshot.paramMap.get('companySlug');
        const id=Number(this.route.snapshot.paramMap.get('packageId'));
        if(!slug || !Number.isSafeInteger(id)||id<=0){this.errorMessage.set('Please choose a valid package.');this.loadingPackage.set(false);return;}
        this.wifiContextService.capture(slug,this.route.snapshot.queryParamMap);
        this.tenantService.setCompanySlug(slug);
        const pending=this.paymentService.pending(slug);
        if(pending){void this.openStatus(slug,pending);return;}
        this.tenantService.loadCompany(slug).pipe(switchMap(()=>this.packageService.getPackageById(slug,id)),
            timeout(20000),takeUntilDestroyed(this.destroyRef)).subscribe({next:item=>{
                this.packageItem.set(item||null);this.loadingPackage.set(false);
                if(!item)this.errorMessage.set('This package is no longer available.');
            },error:()=>{this.loadingPackage.set(false);this.errorMessage.set('We could not load this package. Please try again.');}});
    }
    initiatePayment():void {
        this.paymentForm.markAllAsTouched();
        const item=this.packageItem(),slug=this.tenantService.companySlug();
        if(!item||!slug||this.submitting()||this.paymentForm.invalid||this.uncertain())return;
        const wifi=this.wifiContextService.get(slug);
        if(!wifi){this.errorMessage.set('Connect to this provider’s Wi-Fi and reopen the sign-in page to continue.');return;}
        this.submitting.set(true);this.errorMessage.set('');
        const phone=this.phoneNumber.value ? toInternationalPhone(this.phoneNumber.value):undefined;
        const context={package_id:item.id,mac:wifi.mac,ip:wifi.ip,router:wifi.router,login_url:wifi.loginUrl};
        const request=this.cashMode?this.paymentService.initiateCashPayment({...context,...(phone?{phone_number:phone}:{})}):
            this.paymentService.initiatePayment({...context,phone_number:phone!,payment_method:'selcom'});
        request.pipe(timeout(45000),takeUntilDestroyed(this.destroyRef)).subscribe({next:response=>{
            const reference=response.payment?.transaction_reference;
            if(!response.success||!reference){this.submitting.set(false);this.uncertain.set(true);this.errorMessage.set('We could not read your payment reference. Check your request before trying again.');return;}
            this.paymentService.rememberPending(slug,reference);void this.openStatus(slug,reference);
        },error:error=>{
            this.submitting.set(false);
            if(error.status===409 && typeof error.error?.reference==='string'){
                this.paymentService.rememberPending(slug,error.error.reference);void this.openStatus(slug,error.error.reference);return;
            }
            const unknown=!error.status || error.status>=500;
            this.uncertain.set(unknown);
            this.errorMessage.set(unknown?'The request may have reached us. Check its status before making another payment.':
                error.error?.message || 'We could not start your payment. Please check your details.');
        }});
    }
    requestCashPayment():void {this.initiatePayment();}
    // A repeat submission is deduplicated by the backend's device lock and resumes its reference.
    recoverRequest():void {this.uncertain.set(false);this.initiatePayment();}
    protected async openStatus(slug:string,reference:string):Promise<void> {
        try {await this.router.navigate(['/',slug,'payment-status',reference],{queryParamsHandling:'preserve',replaceUrl:true});}
        finally {this.submitting.set(false);}
    }
}
