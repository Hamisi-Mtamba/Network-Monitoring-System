import { Component } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { PaymentPageComponent } from '../payment/payment';
import { SubscriberPhoneDirective } from '../../shared/subscriber-phone.directive';
// Shared checkout behavior keeps cash and mobile-money validation/navigation consistent.
@Component({selector:'app-cash-payment',standalone:true,imports:[RouterLink,ReactiveFormsModule,SubscriberPhoneDirective,DecimalPipe],
    templateUrl:'../payment/payment.html',styleUrl:'../payment/payment.css'})
export class CashPaymentPageComponent extends PaymentPageComponent {}
