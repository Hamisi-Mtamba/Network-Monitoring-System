// Import Angular component utilities
import {
    Component,
    DestroyRef,
    OnDestroy,
    OnInit,
    inject,
    signal
} from '@angular/core';


// Import Angular reactive forms
import {
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators
} from '@angular/forms';


// Import Angular routing utilities
import {
    ActivatedRoute,
    Router,
    RouterLink
} from '@angular/router';


// Import RxJS utilities used for payment polling
import {
    Subscription,
    interval,
    startWith,
    switchMap
} from 'rxjs';


// Import reusable loading component
import {
    LoadingSpinnerComponent
} from '../../components/loading-spinner/loading-spinner';


// Import payment method card component
import {
    PaymentMethodCardComponent
} from '../../components/payment-method-card/payment-method-card';


// Import reusable status card component
import {
    StatusCardComponent
} from '../../components/status-card/status-card';


// Import package model
import {
    InternetPackage
} from '../../models/package.model';


// Import payment models
import {
    PaymentMethodId,
    PaymentMethodOption,
    PaymentStatusResponse,
    PaymentSuccessDetails
} from '../../models/payment.model';


// Import package service
import {
    PackageService
} from '../../services/package.service';


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


// Stop polling after 24 checks
// 24 × 5 seconds = approximately two minutes
const MAX_PAYMENT_POLLS = 24;


@Component({
    selector: 'app-payment-page',

    standalone: true,

    imports: [
        ReactiveFormsModule,
        RouterLink,
        LoadingSpinnerComponent,
        PaymentMethodCardComponent,
        StatusCardComponent
    ],

    templateUrl: './payment.html',

    styleUrl: './payment.css'
})
export class PaymentPageComponent
    implements OnInit, OnDestroy {

    // Package currently being purchased
    readonly packageItem =
        signal<InternetPackage | null>(null);


    // Package loading state
    readonly loadingPackage =
        signal(true);


    // Payment submission state
    readonly submitting =
        signal(false);


    // True while waiting for payment confirmation
    readonly waiting =
        signal(false);


    // True when payment fails
    readonly failed =
        signal(false);


    // True when payment confirmation takes too long
    readonly timedOut =
        signal(false);


    // Customer-friendly error message
    readonly errorMessage =
        signal('');


    // Current transaction reference
    readonly reference =
        signal('');


    // Number of payment-status checks performed
    readonly pollCount =
        signal(0);


    // Available mobile-money payment methods
    readonly paymentMethods: PaymentMethodOption[] = [

        {
            id: 'mpesa',
            name: 'M-Pesa',
            initials: 'MP',
            color: '#1f8f3a',
            image: 'assets/images/payments/m-pesa.png'
        },

        {
            id: 'airtel_money',
            name: 'Airtel Money',
            initials: 'AM',
            color: '#db1f2a',
            image: 'assets/images/payments/airtel-money.jpg'
        },

        {
            id: 'mixx_by_yas',
            name: 'Mixx by Yas',
            initials: 'MY',
            color: '#7540a6',
            image: 'assets/images/payments/mix by yas.jpg'
        },

        {
            id: 'halopesa',
            name: 'HaloPesa',
            initials: 'HP',
            color: '#ef7d16',
            image: 'assets/images/payments/halopesa.jpg'
        }
    ];


    // Payment form
    readonly paymentForm =
        new FormGroup({

            paymentMethod:
                new FormControl<PaymentMethodId | null>(
                    null,
                    Validators.required
                ),

            phoneNumber:
                new FormControl(
                    '',
                    [
                        Validators.required,

                        // Accept:
                        // 0712345678
                        // 0612345678
                        // +255712345678
                        // 255712345678
                        Validators.pattern(
                            /^(?:\+?255|0)[67]\d{8}$/
                        )
                    ]
                )
        });


    // Current polling subscription
    private pollingSubscription?:
        Subscription;


    // Access route parameters
    private readonly route =
        inject(ActivatedRoute);


    // Access Angular router
    private readonly router =
        inject(Router);


    // Access package service
    readonly packageService =
        inject(PackageService);


    // Access payment service
    private readonly paymentService =
        inject(PaymentService);


    // Access tenant/company service
    readonly tenantService =
        inject(TenantService);


    // Access Angular destruction lifecycle
    private readonly destroyRef =
        inject(DestroyRef);


    constructor() {

        // Always stop polling when this page is destroyed
        this.destroyRef.onDestroy(
            () => this.stopPolling()
        );
    }


    // Load company and package when page opens
    ngOnInit(): void {

        // Read company slug from URL
        const companySlug =
            this.route.snapshot.paramMap.get(
                'companySlug'
            );


        // Read package ID from URL
        const packageId =
            Number(
                this.route.snapshot.paramMap.get(
                    'packageId'
                )
            );


        // Validate company slug
        if (!companySlug) {

            this.errorMessage.set(
                'The Wi-Fi provider could not be identified.'
            );

            this.loadingPackage.set(false);

            return;
        }

        const mac = this.route.snapshot.queryParamMap.get('mac');

        const ip = this.route.snapshot.queryParamMap.get('ip');

        const loginUrl = this.route.snapshot.queryParamMap.get('loginUrl');

        const originalUrl = this.route.snapshot.queryParamMap.get('originalUrl');

        const router = this.route.snapshot.queryParamMap.get('router');


        // Validate package ID
        if (
            !Number.isInteger(packageId) ||
            packageId <= 0
        ) {

            this.errorMessage.set(
                'The selected package is invalid. Please choose a package again.'
            );

            this.loadingPackage.set(false);

            return;
        }


        // Store the current tenant immediately
        // This allows PaymentService to build the correct API URLs
        this.tenantService.setCompanySlug(
            companySlug
        );


        // Load company profile so branding also survives page refresh
        this.tenantService
            .loadCompany(companySlug)
            .subscribe({

                next: () => {

                    // After company is confirmed,
                    // load the selected package from that same company
                    this.loadPackage(
                        companySlug,
                        packageId
                    );
                },


                error: () => {

                    this.errorMessage.set(
                        'This Wi-Fi provider is currently unavailable.'
                    );

                    this.loadingPackage.set(false);
                }
            });
    }


    // Stop polling when component is destroyed
    ngOnDestroy(): void {

        this.stopPolling();
    }


    // Load one package from the correct company
    private loadPackage(
        companySlug: string,
        packageId: number
    ): void {

        this.packageService
            .getPackageById(
                companySlug,
                packageId
            )
            .subscribe({

                next: (packageItem) => {

                    // Package was not found inside this company
                    if (!packageItem) {

                        this.errorMessage.set(
                            'This package is no longer available. Please choose another package.'
                        );

                        this.loadingPackage.set(false);

                        return;
                    }


                    // Store the package
                    this.packageItem.set(
                        packageItem
                    );


                    // Preserve it during navigation
                    this.packageService
                        .selectPackage(
                            packageItem
                        );


                    // Finish loading
                    this.loadingPackage.set(false);
                },


                error: (error) => {

                    console.error(
                        'Failed to load package:',
                        error
                    );


                    this.errorMessage.set(
                        'The package could not be loaded. Please return and try again.'
                    );


                    this.loadingPackage.set(false);
                }
            });
    }


    // Select one mobile-money payment method
    chooseMethod(
        method: PaymentMethodOption
    ): void {

        // Prevent payment method changes while waiting
        if (this.waiting()) {
            return;
        }


        // Update selected payment method
        this.paymentForm.controls
            .paymentMethod
            .setValue(
                method.id
            );


        // Mark the field as interacted with
        this.paymentForm.controls
            .paymentMethod
            .markAsTouched();
    }


    // Remove spaces, brackets and dashes from phone input
    sanitizePhoneInput(): void {

        const control =
            this.paymentForm.controls.phoneNumber;


        const cleaned =
            (control.value || '')
                .replace(
                    /[\s()-]/g,
                    ''
                );


        // Avoid unnecessary form updates
        if (
            control.value !== cleaned
        ) {
            control.setValue(
                cleaned
            );
        }
    }


    // Start mobile-money payment
    initiatePayment(): void {

        // Clean phone input first
        this.sanitizePhoneInput();


        // Show validation messages
        this.paymentForm.markAllAsTouched();


        // Read selected package
        const packageItem =
            this.packageItem();


        // Stop invalid or duplicate submissions
        if (
            this.paymentForm.invalid ||
            !packageItem ||
            this.submitting() ||
            this.waiting()
        ) {
            return;
        }

        const mac = this.route.snapshot.queryParamMap.get('mac');

        const ip = this.route.snapshot.queryParamMap.get('ip');

        const router = this.route.snapshot.queryParamMap.get('router');
        
        const loginUrl = this.route.snapshot.queryParamMap.get('loginUrl');


        // Start submission state
        this.submitting.set(true);


        // Clear previous state
        this.failed.set(false);

        this.timedOut.set(false);

        this.errorMessage.set('');


        // Get selected payment method
        const paymentMethod =
            this.paymentForm.controls
                .paymentMethod
                .value!;


        // Normalize customer's phone number
        const phoneNumber =
            this.normalizePhone(
                this.paymentForm.controls
                    .phoneNumber
                    .value!
            );


        // Send only trusted identifiers.
        // Price remains controlled by the backend.
        this.paymentService
            .initiatePayment({

                package_id:
                    packageItem.id,

                payment_method:
                    paymentMethod,

                phone_number:
                    phoneNumber,

                mac: mac!,

                ip: ip!,

                router: router!,

                login_url: loginUrl!,

            })
            .subscribe({

                next: (response) => {

                    // Backend returns the transaction reference
                    // inside response.payment
                    const transactionReference =
                        response.payment
                            ?.transaction_reference;


                    // Stop if backend did not return a reference
                    if (!transactionReference) {

                        this.submitting.set(false);


                        this.errorMessage.set(
                            'The payment request did not return a reference. Please try again.'
                        );


                        return;
                    }


                    // Save reference for UI and polling
                    this.reference.set(
                        transactionReference
                    );


                    // Submission request completed
                    this.submitting.set(false);


                    // Start waiting for provider confirmation
                    this.waiting.set(true);


                    // Start polling payment status
                    this.startPolling(
                        transactionReference
                    );
                },


                error: (error) => {

                    console.error(
                        'Payment initiation failed:',
                        error
                    );


                    this.submitting.set(false);


                    this.errorMessage.set(
                        'Payment could not be initiated. Check your connection and try again.'
                    );
                }
            });
    }


    // Reset failed/timed-out payment attempt
    retryPayment(): void {

        // Stop old polling
        this.stopPolling();


        // Reset payment state
        this.waiting.set(false);

        this.failed.set(false);

        this.timedOut.set(false);

        this.reference.set('');

        this.pollCount.set(0);

        this.errorMessage.set('');
    }


    // Cancel the current payment wait state
    cancelPayment(): void {

        this.retryPayment();
    }


    // Open the separate cash-payment flow
    goToCashPayment(): void {

        // Read selected package
        const packageItem =
            this.packageItem();


        // Read current company slug
        const companySlug =
            this.tenantService.companySlug();


        // Stop when package is unavailable
        if (!packageItem) {

            this.errorMessage.set(
                'The selected package is unavailable. Please choose a package again.'
            );

            return;
        }

        


        // Stop when company context is missing
        if (!companySlug) {

            this.errorMessage.set(
                'The Wi-Fi provider could not be identified.'
            );

            return;
        }


        // Stop mobile-money polling before leaving this page
        this.stopPolling();


        // Preserve the tenant in the next route
        void this.router.navigate(
            [
                '/',
                companySlug,
                'cash-payment',
                packageItem.id
            ],
            {
                queryParamsHandling: 'preserve'
            }
        );
    }


    // Return the display name of selected payment method
    selectedMethodName(): string {

        const selectedId =
            this.paymentForm.controls
                .paymentMethod
                .value;


        return this.paymentMethods
            .find(
                (method) =>
                    method.id === selectedId
            )
            ?.name || '';
    }


    // Begin checking payment status
    private startPolling(
        reference: string
    ): void {

        // Stop previous polling process
        this.stopPolling();


        // Reset poll count
        this.pollCount.set(0);


        // Run immediately and then every five seconds
        this.pollingSubscription =
            interval(
                PAYMENT_POLL_INTERVAL_MS
            )
                .pipe(

                    // First request happens immediately
                    startWith(0),


                    // Request the latest payment status
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

                        // Count this status check
                        this.pollCount.update(
                            (count) =>
                                count + 1
                        );


                        // Read payment status safely
                        const status =
                            response.payment
                                ?.status
                                ?.toLowerCase();


                        // Backend response did not include payment status
                        if (!status) {

                            this.errorMessage.set(
                                'Payment status could not be read. Please try again.'
                            );

                            this.waiting.set(false);

                            this.stopPolling();

                            return;
                        }


                        // Payment successfully confirmed
                        if (
                            status === 'successful' ||
                            status === 'success' ||
                            status === 'paid'
                        ) {

                            this.handleSuccessfulPayment(
                                response
                            );

                            return;
                        }


                        // Payment failed or was cancelled
                        if (
                            status === 'failed' ||
                            status === 'cancelled'
                        ) {

                            this.failed.set(true);

                            this.waiting.set(false);

                            this.stopPolling();

                            return;
                        }


                        // Stop polling after maximum attempts
                        if (
                            this.pollCount() >=
                            MAX_PAYMENT_POLLS
                        ) {

                            this.timedOut.set(true);

                            this.waiting.set(false);

                            this.stopPolling();
                        }
                    },


                    error: (error) => {

                        console.error(
                            'Payment status check failed:',
                            error
                        );


                        this.errorMessage.set(
                            'We could not confirm the payment status. You can safely retry the check.'
                        );


                        this.waiting.set(false);


                        this.stopPolling();
                    }
                });
    }


    // Process a confirmed successful payment
    private handleSuccessfulPayment(
        response: PaymentStatusResponse
    ): void {

        // Read selected package
        const packageItem =
            this.packageItem();


        // Read company slug
        const companySlug =
            this.tenantService.companySlug();


        // Stop if required application state is unavailable
        if (
            !packageItem ||
            !companySlug
        ) {

            this.errorMessage.set(
                'Payment succeeded, but the session information could not be opened.'
            );


            this.waiting.set(false);


            this.stopPolling();


            return;
        }


        // Read payment data
        const payment =
            response.payment;


        // Read created internet session
        const session =
            response.session;


        // Build data required by the success screen
        const details:
            PaymentSuccessDetails = {

            // Use backend transaction reference
            reference:
                payment
                    ?.transaction_reference ||
                this.reference(),

            // Use backend package name when available
            packageName:
                session?.package_name ||
                packageItem.name,

            // Prefer trusted backend amount
            amount:
                Number(
                    session?.amount_paid ??
                    payment?.amount ??
                    packageItem.price
                ),

            // Payment method
            paymentMethod:
                session?.payment_method ||
                payment?.payment_method ||
                this.selectedMethodName(),

            // Customer phone number
            phoneNumber:
                session?.phone_number ||
                payment?.phone_number ||
                this.paymentForm.controls
                    .phoneNumber
                    .value!,

            // Actual backend session start time
            startedAt:
                session?.started_at ||
                new Date().toISOString(),

            // Actual backend expiry time
            expiresAt:
                session?.expires_at ||
                this.estimatedExpiry(
                    packageItem.duration_minutes
                ),

            // Session ID created after successful payment
            sessionId:
                session?.id,

            // Current session status
            status:
                session?.status ||
                'active'
        };


        // Preserve details for success page
        this.paymentService
            .rememberSuccess(
                details
            );


        // Stop polling
        this.stopPolling();


        // Leave waiting state
        this.waiting.set(false);


        // Navigate to tenant-aware success page
        void this.router.navigate([
            '/',
            companySlug,
            'payment-success',
            details.reference
        ]);
    }


    // Stop active polling subscription
    private stopPolling(): void {

        this.pollingSubscription
            ?.unsubscribe();


        this.pollingSubscription =
            undefined;
    }


    // Convert Tanzanian local number into international format
    private normalizePhone(
        phone: string
    ): string {

        // 0712345678 → +255712345678
        if (
            phone.startsWith('0')
        ) {
            return `+255${phone.slice(1)}`;
        }


        // 255712345678 → +255712345678
        if (
            phone.startsWith('255')
        ) {
            return `+${phone}`;
        }


        // Already +255...
        return phone;
    }


    // Create fallback expiry only when backend did not return one
    private estimatedExpiry(
        durationMinutes: number
    ): string {

        return new Date(
            Date.now() +
            durationMinutes * 60_000
        )
            .toISOString();
    }
}