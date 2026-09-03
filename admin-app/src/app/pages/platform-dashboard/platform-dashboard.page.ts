// Import Angular component utilities
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    signal
} from '@angular/core';


// Import Angular common pipes
import {
    DatePipe
} from '@angular/common';


// Import Angular router utilities
import {
    RouterLink
} from '@angular/router';


// Import Ionic standalone components
import {
    IonButton,
    IonIcon,
    IonSpinner
} from '@ionic/angular/standalone';


// Import Ionic icon registration
import {
    addIcons
} from 'ionicons';


// Import icons used by platform dashboard
import {
    businessOutline,
    cashOutline,
    checkmarkCircleOutline,
    cubeOutline,
    peopleOutline,
    refreshOutline,
    timeOutline,
    wifiOutline
} from 'ionicons/icons';


// Import RxJS helper
import {
    finalize
} from 'rxjs';


// Import platform dashboard models
import {
    PlatformDashboardStats,
    PlatformRecentCompany
} from '../../models/dashboard.model';


// Import dashboard service
import {
    DashboardService
} from '../../services/dashboard.service';


/* =========================================================
   DASHBOARD CARD MODEL
   ========================================================= */

interface PlatformStatCard {

    label: string;

    value: string;

    note: string;

    icon: string;

    tone: string;
}


/* =========================================================
   PLATFORM DASHBOARD COMPONENT
   ========================================================= */

@Component({
    selector: 'app-platform-dashboard',

    standalone: true,

    imports: [
        DatePipe,
        IonButton,
        IonIcon,
        IonSpinner
    ],

    templateUrl:
        './platform-dashboard.page.html',

    styleUrl:
        './platform-dashboard.page.scss',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})
export class PlatformDashboardPage {

    // Platform dashboard API service
    private readonly dashboardService =
        inject(DashboardService);


    // Loading state
    readonly loading =
        signal(true);


    // Error state
    readonly error =
        signal(false);


    // Platform-wide statistics
    readonly stats =
        signal<PlatformDashboardStats | null>(
            null
        );


    // Latest companies created in the platform
    readonly recentCompanies =
        signal<PlatformRecentCompany[]>([]);


    /* =====================================================
       DASHBOARD CARDS
       ===================================================== */

    readonly cards =
        computed<PlatformStatCard[]>(() => {

            const stats =
                this.stats();


            if (!stats) {
                return [];
            }


            return [

                {
                    label:
                        'Companies',

                    value:
                        String(
                            stats.total_companies
                        ),

                    note:
                        `${stats.active_companies} active`,

                    icon:
                        'business-outline',

                    tone:
                        'blue'
                },


                {
                    label:
                        'Company admins',

                    value:
                        String(
                            stats.total_company_admins
                        ),

                    note:
                        'Tenant administrators',

                    icon:
                        'people-outline',

                    tone:
                        'purple'
                },


                {
                    label:
                        'Packages',

                    value:
                        String(
                            stats.total_packages
                        ),

                    note:
                        'Across all companies',

                    icon:
                        'cube-outline',

                    tone:
                        'cyan'
                },


                {
                    label:
                        'Payments',

                    value:
                        String(
                            stats.total_payments
                        ),

                    note:
                        `${stats.successful_payments} successful`,

                    icon:
                        'checkmark-circle-outline',

                    tone:
                        'green'
                },


                {
                    label:
                        'Pending',

                    value:
                        String(
                            stats.pending_payments
                        ),

                    note:
                        'Awaiting confirmation',

                    icon:
                        'time-outline',

                    tone:
                        'orange'
                },


                {
                    label:
                        'Active sessions',

                    value:
                        String(
                            stats.active_sessions
                        ),

                    note:
                        `${stats.total_sessions} total sessions`,

                    icon:
                        'wifi-outline',

                    tone:
                        'slate'
                }
            ];
        });


    /* =====================================================
       INITIAL LOAD
       ===================================================== */

    constructor() {

        // Register icons used by this page
        addIcons({
            businessOutline,
            cashOutline,
            checkmarkCircleOutline,
            cubeOutline,
            peopleOutline,
            refreshOutline,
            timeOutline,
            wifiOutline
        });


        // Load platform data immediately
        this.load();
    }


    /* =====================================================
       LOAD PLATFORM DASHBOARD
       ===================================================== */

    load(): void {

        // Reset state
        this.loading.set(true);

        this.error.set(false);


        // Request platform dashboard from backend
        this.dashboardService
            .getPlatformDashboard()
            .pipe(
                finalize(
                    () =>
                        this.loading.set(false)
                )
            )
            .subscribe({

                next: (response) => {

                    this.stats.set(
                        response.dashboard
                    );


                    this.recentCompanies.set(
                        response.recent_companies
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to load platform dashboard:',
                        error
                    );


                    this.error.set(true);
                }
            });
    }


    /* =====================================================
       MONEY FORMATTER
       ===================================================== */

    money(
        value:
            number |
            string |
            undefined
    ): string {

        return `TZS ${Number(
            value ?? 0
        ).toLocaleString(
            'en-TZ'
        )}`;
    }


    /* =====================================================
       COMPANY STATUS HELPERS
       ===================================================== */

    companyStatusLabel(
        company:
            PlatformRecentCompany
    ): string {

        if (
            company.status ===
            'active'
        ) {
            return 'Active';
        }


        if (
            company.status ===
            'suspended'
        ) {
            return 'Suspended';
        }


        return company.status;
    }


    companyStatusClass(
        company:
            PlatformRecentCompany
    ): string {

        return company.status ===
            'active'
                ? 'status--active'
                : 'status--suspended';
    }
}