// =========================================================
// ANGULAR
// =========================================================

import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    signal
} from '@angular/core';

import {
    DecimalPipe
} from '@angular/common';

import {
    RouterLink
} from '@angular/router';


// =========================================================
// IONIC
// =========================================================

import {
    IonButton,
    IonIcon,
    IonSpinner
} from '@ionic/angular/standalone';

import {
    addIcons
} from 'ionicons';

import {
    arrowForwardOutline,
    cardOutline,
    cashOutline,
    checkmarkCircleOutline,
    cubeOutline,
    refreshOutline,
    timeOutline,
    wifiOutline
} from 'ionicons/icons';


// =========================================================
// RXJS
// =========================================================

import {
    finalize,
    forkJoin
} from 'rxjs';


// =========================================================
// MODELS
// =========================================================

import {
    DashboardStats
} from '../../models/dashboard.model';

import {
    Company
} from '../../models/company.model';


// =========================================================
// SERVICES
// =========================================================

import {
    DashboardService
} from '../../services/dashboard.service';

import {
    AuthService
} from '../../services/auth.service';

import {
    CompanyService
} from '../../services/company.service';


// =========================================================
// CONFIG
// =========================================================

import {
    API_CONFIG
} from '../../config/api.config';


// =========================================================
// DASHBOARD STAT CARD
// =========================================================

interface StatCard {

    label: string;

    value: string;

    note: string;

    icon: string;

    tone: string;
}


// =========================================================
// DASHBOARD COMPONENT
// =========================================================

@Component({
    selector: 'app-dashboard',

    standalone: true,

    imports: [
        DecimalPipe,
        RouterLink,
        IonButton,
        IonIcon,
        IonSpinner
    ],

    templateUrl:
        './dashboard.page.html',

    styleUrl:
        './dashboard.page.scss',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})
export class DashboardPage {

    // =====================================================
    // SERVICES
    // =====================================================

    private readonly dashboardService =
        inject(DashboardService);

    private readonly companyService =
        inject(CompanyService);

    readonly auth =
        inject(AuthService);


    // =====================================================
    // PAGE STATE
    // =====================================================

    readonly loading =
        signal(true);

    readonly error =
        signal(false);

    readonly stats =
        signal<DashboardStats | null>(
            null
        );


    // =====================================================
    // COMPANY STATE
    // =====================================================

    /**
     * Stores the company belonging to the currently
     * authenticated company administrator.
     *
     * This allows the dashboard to show the company
     * name, logo, slug and status.
     */
    readonly company =
        signal<Company | null>(
            null
        );


    // =====================================================
    // STATISTIC CARDS
    // =====================================================

    readonly cards =
        computed<StatCard[]>(() => {

            const stats =
                this.stats();

            if (!stats) {
                return [];
            }

            return [

                {
                    label:
                        'Total packages',

                    value:
                        String(
                            stats.total_packages
                        ),

                    note:
                        'Configured offers',

                    icon:
                        'cube-outline',

                    tone:
                        'blue'
                },


                {
                    label:
                        'Total payments',

                    value:
                        String(
                            stats.total_payments
                        ),

                    note:
                        'All transactions',

                    icon:
                        'card-outline',

                    tone:
                        'purple'
                },


                {
                    label:
                        'Successful',

                    value:
                        String(
                            stats.successful_payments
                        ),

                    note:
                        'Confirmed payments',

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
                        'Customers online',

                    icon:
                        'wifi-outline',

                    tone:
                        'cyan'
                },


                {
                    label:
                        'Expired sessions',

                    value:
                        String(
                            stats.expired_sessions
                        ),

                    note:
                        'Completed access',

                    icon:
                        'refresh-outline',

                    tone:
                        'slate'
                }

            ];
        });


    // =====================================================
    // INITIALIZATION
    // =====================================================

    constructor() {

        // Register all Ionic icons used by this page.
        addIcons({
            arrowForwardOutline,
            cardOutline,
            cashOutline,
            checkmarkCircleOutline,
            cubeOutline,
            refreshOutline,
            timeOutline,
            wifiOutline
        });


        // Load dashboard and company data.
        this.load();
    }


    // =====================================================
    // LOAD DASHBOARD
    // =====================================================

    load(): void {

        this.loading.set(true);

        this.error.set(false);


        /**
         * Load both resources together:
         *
         * 1. Dashboard statistics
         * 2. Logged-in administrator's company
         *
         * The backend determines the company from the
         * authenticated administrator. We do not send or
         * hardcode a company ID here.
         */
        forkJoin({

            dashboard:
                this.dashboardService
                    .getDashboard(),

            company:
                this.companyService
                    .loadCompany()

        })
            .pipe(

                finalize(() => {

                    this.loading.set(false);

                })

            )
            .subscribe({

                next: ({
                    dashboard,
                    company
                }) => {

                    // Store dashboard statistics.
                    this.stats.set(
                        dashboard.dashboard
                    );


                    /**
                     * CompanyService implementations sometimes
                     * return the Company directly and sometimes
                     * return an API object containing `company`.
                     *
                     * Support either form safely.
                     */
                    const companyResult =
                        company as
                            Company |
                            {
                                company: Company;
                            };


                    if (
                        typeof companyResult === 'object' &&
                        companyResult !== null &&
                        'company' in companyResult
                    ) {

                        this.company.set(
                            companyResult.company
                        );

                    } else {

                        this.company.set(
                            companyResult as Company
                        );

                    }

                },


                error: (requestError) => {

                    console.error(
                        'Failed to load dashboard:',
                        requestError
                    );

                    this.error.set(true);

                }

            });
    }


    // =====================================================
    // MONEY FORMATTER
    // =====================================================

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


    // =====================================================
    // PUBLIC IMAGE URL
    // =====================================================

    /**
     * Converts an image path stored by the backend into
     * a browser-accessible URL.
     *
     * Example:
     *
     * Database:
     * /uploads/companies/2/logo/example.png
     *
     * Browser:
     * https://api.example.com/uploads/companies/2/logo/example.png
     *
     * Absolute URLs are returned unchanged.
     */
    publicImageUrl(
        path:
            string |
            null |
            undefined
    ): string {

        if (!path) {
            return '';
        }


        // Already a complete external/public URL.
        if (
            path.startsWith('http://') ||
            path.startsWith('https://')
        ) {
            return path;
        }


        /**
         * Normalize the slash between backendUrl
         * and the stored image path.
         */
        const backendUrl =
            API_CONFIG.backendUrl.replace(
                /\/+$/,
                ''
            );

        const imagePath =
            path.startsWith('/')
                ? path
                : `/${path}`;


        return `${backendUrl}${imagePath}`;
    }
}