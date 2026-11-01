import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  barChartOutline,
  cashOutline,
  cardOutline,
  refreshOutline,
  wifiOutline,
} from 'ionicons/icons';
import { finalize } from 'rxjs';
import { ReportsBundle, ReportService } from '../../services/report.service';
import { NamedCount } from '../../models/report.model';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [DatePipe, IonButton, IonIcon, IonSpinner],
  templateUrl: './reports.page.html',
  styleUrl: './reports.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportsPage {
  private readonly service = inject(ReportService);
  readonly reports = signal<ReportsBundle | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);
  readonly maxRevenue = computed(() =>
    Math.max(
      1,
      ...(this.reports()?.revenue.revenue_by_date ?? []).map((x) =>
        Number(x.revenue),
      ),
    ),
  );
  constructor() {
    addIcons({
      barChartOutline,
      cashOutline,
      cardOutline,
      refreshOutline,
      wifiOutline,
    });
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.service
      .getReports()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (r) => this.reports.set(r),
        error: () => this.error.set(true),
      });
  }
  money(value: number | string): string {
    return `TZS ${Number(value).toLocaleString('en-TZ')}`;
  }
  revenueHeight(value: number | string): number {
    return (Number(value) / this.maxRevenue()) * 100;
  }
  label(item: NamedCount): string {
    return (
      item.name ??
      item.status ??
      item.payment_method ??
      item.package_name ??
      'Other'
    );
  }
  width(value: number | string, items: NamedCount[]): number {
    const max = Math.max(1, ...items.map((x) => Number(x.count)));
    return (Number(value) / max) * 100;
  }
}
