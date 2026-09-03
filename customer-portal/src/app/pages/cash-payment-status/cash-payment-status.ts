// Import Angular component utilities
import {
    Component,
    DestroyRef,
    OnInit,
    inject,
    signal
} from '@angular/core';


// Import Angular routing utilities
import {
    ActivatedRoute,
    Router,
    RouterLink
} from '@angular/router';


// Import RxJS utilities used for polling
import {
    Subscription,
    interval,
    startWith,
    switchMap
} from 'rxjs';


// Import payment models
import {
    PaymentStatusResponse,
    PaymentSuccessDetails
} from '../../models/payment.model';


// Import payment service
import {
    PaymentService
} from '../../services/payment.service';


// Import tenant/company service
import {
    TenantService
} from '../../services/tenant.service';


// Check payment status every five seconds
const PAYMENT_POLL_INTERVAL_MS = 5_000;


// Stop automatic polling after 24 checks
// 24 × 5 seconds = approximately two minutes
const MAX_PAYMENT_POLLS = 24;


@Component({
    selector: 'app-cash-payment-status',

    standalone: true,

    imports: [
        RouterLink
    ],

    templateUrl: './cash-payment-status.html',

    styleUrl: './cash-payment-status.css'
})
export class CashPaymentStatusPageComponent
    implements OnInit {

    // Cash transaction reference from the route
    readonly reference =
        signal('');


    // Current payment information returned by backend
    readonly payment =
        signal<
            PaymentStatusResponse['payment'] | null
        >(null);


    // Internet session created after cash confirmation
    readonly session =
        signal<
            PaymentStatusResponse['session'] | null
        >(null);


    // Page loading state
    readonly loading =
        signal(true);


    // True while automatic payment-status checking is active
    readonly checking =
        signal(false);


    // True after administrator confirms the payment
    readonly confirmed =
        signal(false);


    // True when cash request is rejected or cancelled
    readonly rejected =
        signal(false);


    // Customer-friendly error message
    readonly errorMessage =
        signal('');


    // Number of payment-status checks already performed
    readonly pollCount =
        signal(0);


    // Active polling subscription
    private pollingSubscription?:
        Subscription;


    // Access current route parameters
    private readonly route =
        inject(ActivatedRoute);


    // Access Angular navigation
    private readonly router =
        inject(Router);


    // Access payment API/state
    private readonly paymentService =
        inject(PaymentService);


    // Access current company/tenant state
    readonly tenantService =
        inject(TenantService);


    // Access Angular component destruction lifecycle
    private readonly destroyRef =
        inject(DestroyRef);


    constructor() {

        // Stop network polling when customer leaves the page
        this.destroyRef.onDestroy(
            () => this.stopPolling()
        );
    }


    // Resolve company and transaction reference when page opens
    ngOnInit(): void {

        // Read company slug from:
        // /:companySlug/cash-payment-status/:reference
        const companySlug =
            this.route.snapshot.paramMap.get(
                'companySlug'
            );


        // Read payment reference from URL
        const reference =
            this.route.snapshot.paramMap.get(
                'reference'
            );


        // Company must always exist in a tenant-aware URL
        if (!companySlug) {

            this.errorMessage.set(
                'The Wi-Fi provider could not be identified.'
            );

            this.loading.set(false);

            return;
        }


        // Payment reference is also required
        if (!reference) {

            this.errorMessage.set(
                'The cash payment reference is missing.'
            );

            this.loading.set(false);

            return;
        }


        // Save transaction reference for the UI
        this.reference.set(
            reference
        );


        // Store tenant immediately
        this.tenantService.setCompanySlug(
            companySlug
        );


        // Load company profile and branding first
        this.tenantService
            .loadCompany(companySlug)
            .subscribe({

                next: () => {

                    // Company is valid.
                    // Begin checking payment status.
                    this.startPolling(
                        reference
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to load company:',
                        error
                    );


                    this.loading.set(false);


                    this.errorMessage.set(
                        'This Wi-Fi provider is currently unavailable.'
                    );
                }
            });
    }


    // Poll the tenant-specific payment-status endpoint
    private startPolling(
        reference: string
    ): void {

        // Stop any previous polling process
        this.stopPolling();


        // Reset state for a fresh check
        this.pollCount.set(0);

        this.checking.set(true);

        this.loading.set(true);


        // Run first request immediately,
        // then continue every five seconds
        this.pollingSubscription =
            interval(
                PAYMENT_POLL_INTERVAL_MS
            )
                .pipe(

                    // Immediately perform first request
                    startWith(0),


                    // Request latest payment status
                    switchMap(
                        () =>
                            this.paymentService
                                .getPaymentStatus(
                                    reference
                                )
                    )
                )
                .subscribe({

                    next: (response) => {

                        // Initial request completed
                        this.loading.set(false);


                        // Store latest payment data
                        this.payment.set(
                            response.payment
                        );


                        // Session may remain null
                        // until administrator confirms payment
                        this.session.set(
                            response.session
                        );


                        // Count completed status check
                        this.pollCount.update(
                            (count) =>
                                count + 1
                        );


                        // Read status safely
                        const status =
                            response.payment
                                ?.status
                                ?.toLowerCase();


                        // Backend should always provide payment status
                        if (!status) {

                            this.checking.set(false);


                            this.errorMessage.set(
                                'The payment status could not be read.'
                            );


                            this.stopPolling();

                            return;
                        }


                        // =========================================
                        // CASH PAYMENT CONFIRMED
                        // =========================================

                        if (
                            status === 'successful' ||
                            status === 'success' ||
                            status === 'paid'
                        ) {

                            this.confirmed.set(true);

                            this.checking.set(false);


                            this.handleConfirmedPayment(
                                response
                            );


                            return;
                        }


                        // =========================================
                        // CASH REQUEST REJECTED
                        // =========================================

                        if (
                            status === 'failed' ||
                            status === 'rejected' ||
                            status === 'cancelled'
                        ) {

                            this.rejected.set(true);

                            this.checking.set(false);


                            this.stopPolling();


                            return;
                        }


                        // =========================================
                        // STILL WAITING FOR ADMIN
                        // =========================================

                        if (
                            status ===
                                'awaiting_cash_confirmation' ||
                            status === 'pending'
                        ) {

                            this.checking.set(true);
                        }


                        // Stop automatic polling eventually.
                        //
                        // The actual payment request remains stored
                        // in PostgreSQL and can still be confirmed
                        // later by the company administrator.
                        if (
                            this.pollCount() >=
                            MAX_PAYMENT_POLLS
                        ) {

                            this.checking.set(false);


                            this.stopPolling();
                        }
                    },


                    error: (error) => {

                        console.error(
                            'Cash payment status check failed:',
                            error
                        );


                        this.loading.set(false);

                        this.checking.set(false);


                        this.errorMessage.set(
                            'We could not check the cash payment status right now. Your request is still saved and can still be confirmed by the administrator.'
                        );


                        this.stopPolling();
                    }
                });
    }


    // Convert confirmed cash payment into the same
    // success structure used by mobile-money payments
    private handleConfirmedPayment(
        response: PaymentStatusResponse
    ): void {

        // Read backend payment
        const payment =
            response.payment;


        // Read created internet session
        const session =
            response.session;


        // Read current tenant
        const companySlug =
            this.tenantService.companySlug();


        // Successful cash payment should normally
        // already have an internet session
        if (!session) {

            this.errorMessage.set(
                'Payment was confirmed, but the internet session is still being prepared.'
            );


            return;
        }


        // Tenant must remain available before navigation
        if (!companySlug) {

            this.errorMessage.set(
                'Payment was confirmed, but the Wi-Fi provider information is unavailable.'
            );


            return;
        }


        // Build data used by payment success page
        const details:
            PaymentSuccessDetails = {

            // Real transaction reference
            reference:
                payment.transaction_reference,


            // Package name created with the session
            packageName:
                session.package_name ||
                'Internet Package',


            // Trusted amount from backend
            amount:
                Number(
                    session.amount_paid ??
                    payment.amount ??
                    0
                ),


            // Should normally be "cash"
            paymentMethod:
                session.payment_method ||
                payment.payment_method ||
                'cash',


            // Customer identification phone number
            phoneNumber:
                session.phone_number ||
                payment.phone_number ||
                'Not provided',


            // Session start time from PostgreSQL
            startedAt:
                session.started_at,


            // Session expiry time from PostgreSQL
            expiresAt:
                session.expires_at,


            // Created internet session ID
            sessionId:
                session.id,


            // Current internet session state
            status:
                session.status ||
                'active'
        };


        // Save successful payment details
        this.paymentService
            .rememberSuccess(
                details
            );


        // Stop polling
        this.stopPolling();


        // Navigate to tenant-aware success page
        void this.router.navigate([
            '/',
            companySlug,
            'payment-success',
            details.reference
        ]);
    }


    // Allow customer to manually resume status checking
    checkAgain(): void {

        // Get stored transaction reference
        const reference =
            this.reference();


        // Cannot check without reference
        if (!reference) {
            return;
        }


        // Clear previous messages/state
        this.errorMessage.set('');

        this.rejected.set(false);

        this.confirmed.set(false);


        // Restart status checking
        this.startPolling(
            reference
        );
    }


    // Stop active RxJS polling
    private stopPolling(): void {

        this.pollingSubscription
            ?.unsubscribe();


        this.pollingSubscription =
            undefined;
    }
}