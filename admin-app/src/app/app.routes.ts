// Import Angular routing types
import {
    Routes
} from '@angular/router';


// Import authentication and role guards
import {
    companyAdminGuard,
    guestGuard,
    superAdminGuard
} from './guards/auth.guard';


/* =========================================================
   ADMIN APPLICATION ROUTES
   =========================================================
 *
 * Application areas:
 *
 * /login
 *     Public login page
 *
 * /dashboard, /packages, ...
 *     Normal company administrator
 *
 * /platform/...
 *     Platform Superadmin
 *
 * ========================================================= */

export const routes: Routes = [

    // =========================================================
    // LOGIN
    // =========================================================

    {
        path: 'login',

        canActivate: [
            guestGuard
        ],

        loadComponent: () =>
            import('./pages/login/login.page')
                .then(
                    (module) =>
                        module.LoginPage
                ),

        title: 'Admin Login'
    },


    // =========================================================
    // SUPERADMIN PLATFORM
    // =========================================================

    {
        path: 'platform',

        canActivate: [
            superAdminGuard
        ],

        loadComponent: () =>
            import(
                './layout/admin-layout/admin-layout.component'
            )
                .then(
                    (module) =>
                        module.AdminLayoutComponent
                ),

        children: [

            // -------------------------------------------------
            // PLATFORM DASHBOARD
            // -------------------------------------------------

            {
                path: 'dashboard',

                loadComponent: () =>
                    import(
                        './pages/platform-dashboard/platform-dashboard.page'
                    )
                        .then(
                            (module) =>
                                module.PlatformDashboardPage
                        ),

                title: 'Platform Dashboard'
            },


            // -------------------------------------------------
            // PLATFORM COMPANIES
            // -------------------------------------------------

            {
                path: 'companies',

                loadComponent: () =>
                    import(
                        './pages/platform-companies/platform-companies.page'
                    )
                        .then(
                            (module) =>
                                module.PlatformCompaniesPage
                        ),

                title: 'Companies'
            },


            // -------------------------------------------------
            // SELECTED COMPANY WORKSPACE
            // -------------------------------------------------

            {
                path: 'companies/:companyId',

                loadComponent: () =>
                    import(
                        './pages/platform-company/platform-company.page'
                    )
                        .then(
                            (module) =>
                                module.PlatformCompanyPage
                        ),

                title: 'Manage Company'
            },


            // -------------------------------------------------
            // PLATFORM ROOT
            // -------------------------------------------------

            {
                path: '',

                pathMatch: 'full',

                redirectTo: 'dashboard'
            }
        ]
    },


    // =========================================================
    // COMPANY ADMINISTRATION
    // =========================================================

    {
        path: '',

        canActivate: [
            companyAdminGuard
        ],

        loadComponent: () =>
            import(
                './layout/admin-layout/admin-layout.component'
            )
                .then(
                    (module) =>
                        module.AdminLayoutComponent
                ),

        children: [

            // -------------------------------------------------
            // DASHBOARD
            // -------------------------------------------------

            {
                path: 'dashboard',

                loadComponent: () =>
                    import(
                        './pages/dashboard/dashboard.page'
                    )
                        .then(
                            (module) =>
                                module.DashboardPage
                        ),

                title: 'Dashboard'
            },


            // -------------------------------------------------
            // PACKAGES
            // -------------------------------------------------

            {
                path: 'packages',

                loadComponent: () =>
                    import(
                        './pages/packages/packages.page'
                    )
                        .then(
                            (module) =>
                                module.PackagesPage
                        ),

                title: 'Internet Packages'
            },


            // -------------------------------------------------
            // PAYMENTS
            // -------------------------------------------------

            {
                path: 'payments',

                loadComponent: () =>
                    import(
                        './pages/payments/payments.page'
                    )
                        .then(
                            (module) =>
                                module.PaymentsPage
                        ),

                title: 'Payments'
            },


            {
                path: 'payments/:id',

                loadComponent: () =>
                    import(
                        './pages/payment-details/payment-details.page'
                    )
                        .then(
                            (module) =>
                                module.PaymentDetailsPage
                        ),

                title: 'Payment Details'
            },


            // -------------------------------------------------
            // SESSIONS
            // -------------------------------------------------

            {
                path: 'sessions',

                loadComponent: () =>
                    import(
                        './pages/sessions/sessions.page'
                    )
                        .then(
                            (module) =>
                                module.SessionsPage
                        ),

                title: 'Internet Sessions'
            },


            {
                path: 'sessions/:id',

                loadComponent: () =>
                    import(
                        './pages/session-details/session-details.page'
                    )
                        .then(
                            (module) =>
                                module.SessionDetailsPage
                        ),

                title: 'Session Details'
            },


            // -------------------------------------------------
            // REPORTS
            // -------------------------------------------------

            {
                path: 'reports',

                loadComponent: () =>
                    import(
                        './pages/reports/reports.page'
                    )
                        .then(
                            (module) =>
                                module.ReportsPage
                        ),

                title: 'Reports'
            },


            // -------------------------------------------------
            // SETTINGS
            // -------------------------------------------------

            {
                path: 'settings',

                loadComponent: () =>
                    import(
                        './pages/settings/settings.page'
                    )
                        .then(
                            (module) =>
                                module.SettingsPage
                        ),

                title: 'Settings'
            },


            // -------------------------------------------------
            // COMPANY ADMIN ROOT
            // -------------------------------------------------

            {
                path: '',

                pathMatch: 'full',

                redirectTo: 'dashboard'
            }
        ]
    },


    // =========================================================
    // INVALID ROUTES
    // =========================================================

    {
        path: '**',

        redirectTo: ''
    }
];