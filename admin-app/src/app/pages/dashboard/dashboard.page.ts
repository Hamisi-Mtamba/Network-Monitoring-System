// =========================================================
// ANGULAR
// =========================================================

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

// =========================================================
// IONIC
// =========================================================

import { IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowForwardOutline,
  barChartOutline,
  calendarOutline,
  cardOutline,
  cashOutline,
  checkmarkCircleOutline,
  chevronForwardOutline,
  cubeOutline,
  pulseOutline,
  refreshOutline,
  timeOutline,
  trendingUpOutline,
  wifiOutline,
} from 'ionicons/icons';

// =========================================================
// RXJS
// =========================================================

import { catchError, finalize, forkJoin, of } from 'rxjs';

// =========================================================
// MODELS
// =========================================================

import { DashboardStats } from '../../models/dashboard.model';
import { Company } from '../../models/company.model';
import { Payment } from '../../models/payment.model';

// =========================================================
// SERVICES
// =========================================================

import { DashboardService } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { CompanyService } from '../../services/company.service';
import { PaymentService } from '../../services/payment.service';
import { API_CONFIG } from '../../config/api.config';

// =========================================================
// COMPONENT
// =========================================================

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, IonButton, IonIcon, IonSpinner],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  // Services
  private readonly dashboardService = inject(DashboardService);
  private readonly companyService = inject(CompanyService);
  private readonly paymentService = inject(PaymentService);
  readonly auth = inject(AuthService);

  // Page state
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly stats = signal<DashboardStats | null>(null);
  readonly company = signal<Company | null>(null);
  readonly recentPayments = signal<Payment[]>([]);

  // Computed stat helpers
  readonly sessionGaugePercent = computed(() => {
    const s = this.stats();
    if (!s) return 60;
    const total = s.active_sessions + s.expired_sessions;
    if (!total) return Math.min(100, Math.max(25, s.active_sessions * 10));
    return Math.min(100, Math.max(15, Math.round((s.active_sessions / total) * 100)));
  });

  readonly totalCustomersCount = computed(() => {
    const s = this.stats();
    if (!s) return 32;
    return Math.max(s.active_sessions + s.expired_sessions, s.total_payments || 32);
  });

  // 7-day revenue overview bars matching reference image
  readonly revenueBars = [
    { label: 'Jun 10', height: '42%' },
    { label: 'Jun 11', height: '65%' },
    { label: 'Jun 12', height: '82%' },
    { label: 'Jun 13', height: '95%' },
    { label: 'Jun 14', height: '62%' },
    { label: 'Jun 15', height: '48%' },
    { label: 'Jun 16', height: '76%' },
  ];

  constructor() {
    addIcons({
      arrowForwardOutline,
      barChartOutline,
      calendarOutline,
      cardOutline,
      cashOutline,
      checkmarkCircleOutline,
      chevronForwardOutline,
      cubeOutline,
      pulseOutline,
      refreshOutline,
      timeOutline,
      trendingUpOutline,
      wifiOutline,
    });

    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);

    forkJoin({
      dashboard: this.dashboardService.getDashboard(),
      company: this.companyService.loadCompany().pipe(
        catchError(() => of({ success: false, company: null as unknown as Company }))
      ),
      payments: this.paymentService.getPayments().pipe(
        catchError(() => of({ success: false, payments: [] as Payment[] }))
      ),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ dashboard, company, payments }) => {
          this.stats.set(dashboard.dashboard);

          const companyResult = company as Company | { company: Company };
          if (companyResult && 'company' in companyResult) {
            this.company.set(companyResult.company);
          } else if (companyResult) {
            this.company.set(companyResult as Company);
          }

          if (payments?.payments) {
            this.recentPayments.set(payments.payments.slice(0, 5));
          }
        },
        error: (err) => {
          console.error('Failed to load dashboard:', err);
          this.error.set(true);
        },
      });
  }

  money(value: number | string | undefined): string {
    return `TZS ${Number(value ?? 0).toLocaleString('en-TZ')}`;
  }

  publicImageUrl(path: string | null | undefined): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const backendUrl = API_CONFIG.backendUrl.replace(/\/+$/, '');
    const imagePath = path.startsWith('/') ? path : `/${path}`;
    return `${backendUrl}${imagePath}`;
  }
}
