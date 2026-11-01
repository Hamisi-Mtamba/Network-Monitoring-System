import { API_CONFIG } from '../../config/api.config';
import { CompanyService } from '../../services/company.service';
// Import Angular component utilities
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';

// Import Angular router utilities
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';

// Import Ionic standalone components
import {
  IonAvatar,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenu,
  IonMenuButton,
  IonSplitPane,
  IonTitle,
  IonToolbar,
  MenuController,
} from '@ionic/angular/standalone';

// Import Ionic icon registration
import { addIcons } from 'ionicons';

// Import icons used by the navigation
import {
  barChartOutline,
  businessOutline,
  cardOutline,
  chevronDownOutline,
  cubeOutline,
  gridOutline,
  logOutOutline,
  notificationsOutline,
  peopleOutline,
  personOutline,
  pulseOutline,
  radioOutline,
  searchOutline,
  settingsOutline,
} from 'ionicons/icons';

// Import authentication service
import { AuthService } from '../../services/auth.service';

// Import shared UI service
import { UiService } from '../../services/ui.service';

/* =========================================================
   NAVIGATION ITEM MODEL
   ========================================================= */

interface NavItem {
  label: string;

  route: string;

  icon: string;
}

/* =========================================================
   ADMIN LAYOUT COMPONENT
   ========================================================= */

@Component({
  selector: 'app-admin-layout',

  standalone: true,

  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    IonButtons,
    IonContent,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonMenu,
    IonMenuButton,
    IonSplitPane,
  ],

  templateUrl: './admin-layout.component.html',

  styleUrl: './admin-layout.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLayoutComponent {
  // Authentication state is intentionally public
  // because the layout template needs admin details.
  readonly auth = inject(AuthService);
  readonly companyService = inject(CompanyService);
  readonly company = this.companyService.company;
  readonly companyLogo = computed(() => {
    const url = this.company()?.logo_url;
    if (!url) return null;
    return /^(https?:|data:|blob:)/i.test(url) ? url : API_CONFIG.backendUrl + (url.startsWith('/') ? url : '/' + url);
  });

  // Shared confirmation/dialog service
  private readonly ui = inject(UiService);

  // Ionic menu controller
  private readonly menu = inject(MenuController);

  // Angular router
  private readonly router = inject(Router);

  /* =====================================================
       ADMIN IDENTITY
       ===================================================== */

  readonly initials = computed(() => {
    const name = this.auth.admin()?.name?.trim();
    if (!name) {
      return this.isSuperAdmin() ? 'S' : 'A';
    }
    return name.charAt(0).toUpperCase();
  });

  readonly roleLabel = computed(() => {
    if (this.auth.isSuperAdmin()) {
      return 'Superadmin';
    }

    if (this.auth.isCompanyAdmin()) {
      return 'Company Admin';
    }

    return 'Administrator';
  });

  readonly isSuperAdmin = computed(() => this.auth.isSuperAdmin());

  /* =====================================================
       COMPANY ADMIN NAVIGATION
       ===================================================== */

  private readonly companyAdminNavItems: NavItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      icon: 'grid-outline',
    },
    { label: 'Packages', route: '/packages', icon: 'cube-outline' },

    {
      label: 'Payments',
      route: '/payments',
      icon: 'card-outline',
    },

    {
      label: 'Sessions',
      route: '/sessions',
      icon: 'pulse-outline',
    },

    {
      label: 'Reports',
      route: '/reports',
      icon: 'bar-chart-outline',
    },

    {
      label: 'Settings',
      route: '/settings',
      icon: 'settings-outline',
    },
  ];

  /* =====================================================
       SUPERADMIN NAVIGATION
       ===================================================== */

  private readonly superAdminNavItems: NavItem[] = [
    {
      label: 'Dashboard',
      route: '/platform/dashboard',
      icon: 'grid-outline',
    },

    {
      label: 'Companies',
      route: '/platform/companies',
      icon: 'business-outline',
    },
  ];

  /* =====================================================
       ACTIVE NAVIGATION
       ===================================================== */

  readonly navItems = computed<NavItem[]>(() => {
    if (this.auth.isSuperAdmin()) {
      return this.superAdminNavItems;
    }

    return this.companyAdminNavItems;
  });

  /* =====================================================
       CONSTRUCTOR
       ===================================================== */

  constructor() {
    addIcons({
      gridOutline,
      cubeOutline,
      cardOutline,
      pulseOutline,
      barChartOutline,
      personOutline,
      logOutOutline,
      radioOutline,
      businessOutline,
      peopleOutline,
      settingsOutline,
      searchOutline,
      notificationsOutline,
      chevronDownOutline,
    });

    if (this.auth.isSuperAdmin()) this.companyService.clearCompany();
    if (this.auth.isCompanyAdmin()) this.companyService.loadCompany().subscribe({error:()=>{}});

    // Refresh administrator information from backend
    // when a stored authentication token exists.
    if (this.auth.token) {
      this.auth.loadCurrentAdmin().subscribe({
        error: () => {
          // Keep the shared layout alive here.
          // Route/auth handling will deal with
          // invalid authentication state.
        },
      });
    }
  }

  /* =====================================================
       MOBILE MENU
       ===================================================== */

  async closeMenu(): Promise<void> {
    await this.menu.close('admin-menu');
  }

  /* =====================================================
       LOGOUT
       ===================================================== */

  async logout(): Promise<void> {
    const confirmed = await this.ui.confirm(
      'Log out?',
      'You will need to sign in again to continue managing the system.',
      'Log out',
    );

    if (!confirmed) {
      return;
    }

    await this.menu.close('admin-menu');

    this.auth.logout(false);

    await this.router.navigateByUrl('/login', {
      replaceUrl: true,
    });
  }
}
