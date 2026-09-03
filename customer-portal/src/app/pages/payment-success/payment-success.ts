// Import Angular common utilities
import {
    DatePipe,
    UpperCasePipe
} from '@angular/common';


// Import Angular component utilities
import {
    Component,
    OnInit,
    inject,
    signal
} from '@angular/core';


// Import Angular routing utilities
import {
    ActivatedRoute,
    RouterLink
} from '@angular/router';


// Import reusable loading component
import {
    LoadingSpinnerComponent
} from '../../components/loading-spinner/loading-spinner';


// Import reusable status component
import {
    StatusCardComponent
} from '../../components/status-card/status-card';


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


@Component({
    selector: 'app-payment-success-page',

    standalone: true,

    imports: [
        DatePipe,
        RouterLink,
        LoadingSpinnerComponent,
        StatusCardComponent
    ],

    templateUrl: './payment-success.html',

    styleUrl: './payment-success.css'
})
export class PaymentSuccessPageComponent
    implements OnInit {

    // Confirmed payment/session details
    readonly details =
        signal<PaymentSuccessDetails | null>(null);


    // Page loading state
    readonly loading =
        signal(true);


    // Customer-friendly error message
    readonly errorMessage =
        signal('');


    // Access route parameters
    private readonly route =
        inject(ActivatedRoute);


    // Access payment API/state
    private readonly paymentService =
        inject(PaymentService);


    // Access current company/tenant
    readonly tenantService =
        inject(TenantService);


    // Resolve company and payment details when page opens
    ngOnInit(): void {

        // Read company slug from:
        // /:companySlug/payment-success/:reference
        const companySlug =
            this.route.snapshot.paramMap.get(
                'companySlug'
            );


        // Read transaction reference from URL
        const routeReference =
            decodeURIComponent(
                this.route.snapshot.paramMap.get(
                    'reference'
                ) || ''
            );


        // Company must exist in tenant-aware route
        if (!companySlug) {

            this.errorMessage.set(
                'The Wi-Fi provider could not be identified.'
            );

            this.loading.set(false);

            return;
        }


        // Payment reference is required
        if (!routeReference) {

            this.errorMessage.set(
                'Payment details are unavailable. Please return to the packages page.'
            );

            this.loading.set(false);

            return;
        }


        // Store tenant immediately
        this.tenantService.setCompanySlug(
            companySlug
        );


        // Load company profile and branding first.
        // This also makes direct browser refreshes safe.
        this.tenantService
            .loadCompany(companySlug)
            .subscribe({

                next: () => {

                    // Company is valid.
                    // Continue loading payment details.
                    this.loadPaymentDetails(
                        routeReference
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to load company:',
                        error
                    );


                    this.errorMessage.set(
                        'This Wi-Fi provider is currently unavailable.'
                    );


                    this.loading.set(false);
                }
            });
    }


    // Load confirmed payment information
    private loadPaymentDetails(
        routeReference: string
    ): void {

        // First use locally remembered success details
        const remembered =
            this.paymentService.lastSuccess();


        // Use cached details only when they match
        // the current transaction reference
        if (
            remembered &&
            remembered.reference === routeReference
        ) {

            this.details.set(
                remembered
            );

            this.loading.set(false);

            return;
        }


        // Refresh-safe fallback:
        // request payment status from backend
        this.paymentService
            .getPaymentStatus(
                routeReference
            )
            .subscribe({

                next: (response) => {

                    // Read payment status safely
                    const status =
                        response.payment
                            ?.status
                            ?.toLowerCase();


                    // Backend did not return a readable status
                    if (!status) {

                        this.errorMessage.set(
                            'Payment status could not be read.'
                        );

                        this.loading.set(false);

                        return;
                    }


                    // Payment must be confirmed before showing success
                    if (
                        ![
                            'successful',
                            'success',
                            'paid'
                        ].includes(status)
                    ) {

                        this.errorMessage.set(
                            'This payment has not been confirmed yet.'
                        );

                        this.loading.set(false);

                        return;
                    }


                    // Convert backend response
                    // into success-page details
                    const mapped =
                        this.mapResponse(
                            response
                        );


                    // Store details for UI
                    this.details.set(
                        mapped
                    );


                    // Preserve details during navigation/refresh
                    this.paymentService
                        .rememberSuccess(
                            mapped
                        );


                    // Finish loading
                    this.loading.set(false);
                },


                error: (error) => {

                    console.error(
                        'Failed to load payment details:',
                        error
                    );


                    this.errorMessage.set(
                        'Payment details could not be loaded. Please check your connection.'
                    );


                    this.loading.set(false);
                }
            });
    }


    // Convert backend payment/session response
    // into the structure required by the success page
    private mapResponse(
        response: PaymentStatusResponse
    ): PaymentSuccessDetails {

        // Read payment information
        const payment =
            response.payment;


        // Read internet session information
        const session =
            response.session;


        // Build normalized success details
        const details:
            PaymentSuccessDetails = {

            // Real transaction reference
            reference:
                payment.transaction_reference,


            // Prefer package name from created session
            packageName:
                session?.package_name ||
                'Internet Package',


            // Prefer trusted amount from session/payment
            amount:
                Number(
                    session?.amount_paid ??
                    payment.amount ??
                    0
                ),


            // Mobile money or cash payment method
            paymentMethod:
                session?.payment_method ||
                payment.payment_method ||
                'Payment',


            // Phone number associated with payment
            phoneNumber:
                session?.phone_number ||
                payment.phone_number ||
                'Not provided',


            // Session start time
            startedAt:
                session?.started_at ||
                new Date().toISOString(),


            // Session expiry time
            expiresAt:
                session?.expires_at ||
                new Date().toISOString(),


            // Created internet session ID
            sessionId:
                session?.id,


            // Current internet session state
            status:
                session?.status ||
                'active'
        };


        return details;
    }
}