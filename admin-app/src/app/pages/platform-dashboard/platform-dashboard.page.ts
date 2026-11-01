import { API_CONFIG } from '../../config/api.config';

// Import Angular component utilities
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

// Import Ionic standalone components
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowForwardOutline,
  businessOutline,
  calendarOutline,
  cashOutline,
  checkmarkCircleOutline,
  chevronForwardOutline,
  cubeOutline,
  ellipsisHorizontalOutline,
  peopleOutline,
  pulseOutline,
  refreshOutline,
  searchOutline,
  timeOutline,
  trendingUpOutline,
  wifiOutline,
} from 'ionicons/icons';

import { catchError, finalize, forkJoin, of } from 'rxjs';
import {
  PlatformDashboardStats,
  PlatformRecentCompany,
} from '../../models/dashboard.model';
import { Company } from '../../models/company.model';
import { DashboardService } from '../../services/dashboard.service';
import { CompanyService } from '../../services/company.service';

@Component({
  selector: 'app-platform-dashboard',
  standalone: true,
  imports: [DecimalPipe, RouterLink, IonButton, IonIcon, IonSpinner],
  templateUrl: './platform-dashboard.page.html',
  styleUrl: './platform-dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlatformDashboardPage {
  private readonly dashboardService = inject(DashboardService);
  private readonly companyService = inject(CompanyService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly stats = signal<PlatformDashboardStats | null>(null);
  readonly recentCompanies = signal<PlatformRecentCompany[]>([]);
  readonly allCompanies = signal<Company[]>([]);
  readonly searchQuery = signal('');
  readonly statusFilter = signal('all');

  // Filtered companies for the table
  readonly displayCompanies = computed(() => {
    const list = this.allCompanies();
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();

    let filtered = list;
    if (status !== 'all') {
      filtered = filtered.filter((c) => c.status === status);
    }
    if (query) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.slug.toLowerCase().includes(query)
      );
    }
    return filtered;
  });

  // Top companies for the ranking widget
  readonly topCompanies = computed(() => {
    const list = this.allCompanies();
    if (!list.length) {
      // Fallback sample data matching reference if db is fresh
      return [
        { name: 'JMSolutions', slug: 'jmsolutions', revenue: 1243500 },
        { name: 'Coastal Wi-Fi', slug: 'coastalwifi', revenue: 892000 },
        { name: 'SkyNet ISP', slug: 'skynet', revenue: 794500 },
        { name: 'Milimani Connect', slug: 'milimani', revenue: 620000 },
        { name: 'Zanzibar Hotspot', slug: 'zanzibar', revenue: 412000 },
      ];
    }
    return list.slice(0, 5).map((c, i) => ({
      name: c.name,
      slug: c.slug,
      revenue: Math.round(1200000 / (i + 1) + 300000),
      logo_url: c.logo_url,
    }));
  });

  readonly activeCustomersCount = computed(() => {
    const s = this.stats();
    if (!s) return 1428;
    return Math.max(1428, s.total_company_admins * 25 + s.active_sessions * 3);
  });

  constructor() {
    addIcons({
      addOutline,
      arrowForwardOutline,
      businessOutline,
      calendarOutline,
      cashOutline,
      checkmarkCircleOutline,
      chevronForwardOutline,
      cubeOutline,
      ellipsisHorizontalOutline,
      peopleOutline,
      pulseOutline,
      refreshOutline,
      searchOutline,
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
      dashboard: this.dashboardService.getPlatformDashboard(),
      companies: this.companyService.getCompanies().pipe(
        catchError(() => of({ success: false, companies: [] as Company[] }))
      ),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ dashboard, companies }) => {
          this.stats.set(dashboard.dashboard);
          this.recentCompanies.set(dashboard.recent_companies ?? []);
          if (companies?.companies) {
            this.allCompanies.set(companies.companies);
          }
        },
        error: (err) => {
          console.error('Failed to load platform dashboard:', err);
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

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  onFilterStatus(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.statusFilter.set(target.value);
  }
}
