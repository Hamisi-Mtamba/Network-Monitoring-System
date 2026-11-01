import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  cardOutline,
  checkmarkCircleOutline,
  cubeOutline,
  phonePortraitOutline,
  timeOutline,
} from 'ionicons/icons';
import { finalize } from 'rxjs';
import { Payment, PaymentInternetSession } from '../../models/payment.model';
import { PaymentService } from '../../services/payment.service';

@Component({
  selector: 'app-payment-details',
  standalone: true,
  imports: [DatePipe, RouterLink, IonButton, IonIcon, IonSpinner],
  templateUrl: './payment-details.page.html',
  styleUrl: './payment-details.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentDetailsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(PaymentService);
  readonly payment = signal<Payment | null>(null);
  readonly session = signal<PaymentInternetSession | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  constructor() {
    addIcons({
      arrowBackOutline,
      cardOutline,
      checkmarkCircleOutline,
      cubeOutline,
      phonePortraitOutline,
      timeOutline,
    });
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (Number.isFinite(id)) this.load(id);
    else {
      this.loading.set(false);
      this.error.set(true);
    }
  }
  load(id: number): void {
    this.loading.set(true);
    this.service
      .getPayment(id)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (r) => (this.payment.set(r.payment),this.session.set(r.session??null)),
        error: () => this.error.set(true),
      });
  }
  money(value: number | string): string {
    return `TZS ${Number(value).toLocaleString('en-TZ')}`;
  }
}
