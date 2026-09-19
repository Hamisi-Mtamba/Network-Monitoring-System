import { captureWifiContext } from './services/wifi-context.service';
import { ConnectionCheckPage, reconnectBeforePurchase } from './services/reconnect.guard';
// Import Angular routing types
import {
    Routes
} from '@angular/router';


// Define all customer portal routes
export const routes: Routes = [

    { path: ':companySlug/connection-check', component: ConnectionCheckPage, canActivate: [captureWifiContext] },

    // =========================================================
    // COMPANY PACKAGES
    // =========================================================
    //
    // Example:
    // /abc-company/packages
    {
        path: ':companySlug/packages',

        canActivate: [reconnectBeforePurchase],
        runGuardsAndResolvers: 'paramsOrQueryParamsChange',

        loadComponent: () =>
            import('./pages/packages/packages')
                .then(
                    (module) =>
                        module.PackagesPageComponent
                ),

        title: 'Internet Packages'
    },


    // =========================================================
    // COMPANY PROFILE
    // =========================================================
    //
    // Example:
    // /abc-company/company
    {
        path: ':companySlug/company',

        canActivate: [captureWifiContext],
        runGuardsAndResolvers: 'paramsOrQueryParamsChange',

        loadComponent: () =>
            import('./pages/company/company')
                .then(
                    (module) =>
                        module.CompanyPageComponent
                ),

        title: 'Company Information'
    },


    // =========================================================
    // MOBILE PAYMENT
    // =========================================================
    //
    // Example:
    // /abc-company/payment/3
    {
        path: ':companySlug/payment/:packageId',

        canActivate: [reconnectBeforePurchase],
        runGuardsAndResolvers: 'paramsOrQueryParamsChange',

        loadComponent: () =>
            import('./pages/payment/payment')
                .then(
                    (module) =>
                        module.PaymentPageComponent
                ),

        title: 'Payment'
    },


    // =========================================================
    // PAYMENT SUCCESS
    // =========================================================
    //
    // Example:
    // /abc-company/payment-success/PAY-ABC123
    {
        path: ':companySlug/payment-success/:reference',

        canActivate: [captureWifiContext],
        runGuardsAndResolvers: 'paramsOrQueryParamsChange',

        loadComponent: () =>
            import('./pages/payment-success/payment-success')
                .then(
                    (module) =>
                        module.PaymentSuccessPageComponent
                ),

        title: 'Payment Successful'
    },


    // =========================================================
    // INTERNET SESSION STATUS
    // =========================================================
    //
    // Example:
    // /abc-company/session/12
    {
        path: ':companySlug/session/:id',

        canActivate: [captureWifiContext],
        runGuardsAndResolvers: 'paramsOrQueryParamsChange',

        loadComponent: () =>
            import('./pages/session-status/session-status')
                .then(
                    (module) =>
                        module.SessionStatusPageComponent
                ),

        title: 'Internet Session'
    },


    // =========================================================
    // CASH PAYMENT
    // =========================================================
    //
    // Example:
    // /abc-company/cash-payment/3
    {
        path: ':companySlug/cash-payment/:packageId',

        canActivate: [reconnectBeforePurchase],
        runGuardsAndResolvers: 'paramsOrQueryParamsChange',

        loadComponent: () =>
            import('./pages/cash-payment/cash-payment')
                .then(
                    (module) =>
                        module.CashPaymentPageComponent
                ),

        title: 'Cash Payment'
    },


    // =========================================================
    // CASH PAYMENT STATUS
    // =========================================================
    //
    // Example:
    // /abc-company/cash-payment-status/CASH-ABC123
    {
        path: ':companySlug/cash-payment-status/:reference',

        canActivate: [captureWifiContext],
        runGuardsAndResolvers: 'paramsOrQueryParamsChange',

        loadComponent: () =>
            import('./pages/cash-payment-status/cash-payment-status')
                .then(
                    (module) =>
                        module.CashPaymentStatusPageComponent
                ),

        title: 'Cash Payment Status'
    },


    // =========================================================
    // EXPIRED SESSION
    // =========================================================
    //
    // Example:
    // /abc-company/expired
    {
        path: ':companySlug/expired',

        canActivate: [captureWifiContext],
        runGuardsAndResolvers: 'paramsOrQueryParamsChange',

        loadComponent: () =>
            import('./pages/expired/expired')
                .then(
                    (module) =>
                        module.ExpiredPageComponent
                ),

        title: 'Session Expired'
    },


    // =========================================================
    // COMPANY ROOT
    // =========================================================
    //
    // Example:
    // /abc-company
    //
    // Redirects to:
    // /abc-company/packages
    {
        path: ':companySlug',

        pathMatch: 'full',

        redirectTo: ':companySlug/packages'
    }
];
