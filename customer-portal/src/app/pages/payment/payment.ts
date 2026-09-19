import { SUBSCRIBER_PHONE_PATTERN, toInternationalPhone } from '../../shared/subscriber-phone';
import { SubscriberPhoneDirective } from '../../shared/subscriber-phone.directive';
import {
    Component,
    DestroyRef,
    OnDestroy,
    OnInit,
    inject,
    signal
} from '@angular/core';
import {
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators
} from '@angular/forms';
import {
    ActivatedRoute,
    Router,
    RouterLink
} from '@angular/router';
import {
    Subscription,
    interval,
    startWith,
    switchMap
} from 'rxjs';
import { LoadingSpinnerComponent } from '../../components/loading-spinner/loading-spinner';
import { InternetPackage } from '../../models/package.model';
import {
    PaymentInstructions,
    PaymentStatusResponse,
    PaymentSuccessDetails
} from '../../models/payment.model';
import { PackageService } from '../../services/package.service';
import { PaymentService } from '../../services/payment.service';
import { TenantService } from '../../services/tenant.service';
import { WifiContextService } from '../../services/wifi-context.service';

const PAYMENT_POLL_INTERVAL_MS = 5_000;
const MAX_PAYMENT_POLLS = 60; // About five minutes. The customer can retry status checks afterwards.

@Component({
    selector: 'app-payment-page',
    standalone: true,
    imports: [
        SubscriberPhoneDirective,
        ReactiveFormsModule,
        RouterLink,
        LoadingSpinnerComponent
    ],
    templateUrl: './payment.html',
    styleUrl: './payment.css'
})
export class PaymentPageComponent implements OnInit, OnDestroy {
    readonly packageItem = signal<InternetPackage | null>(null);
    readonly loadingPackage = signal(true);
    readonly submitting = signal(false);
    readonly waiting = signal(false);
    readonly failed = signal(false);
    readonly timedOut = signal(false);
    readonly approved = signal(false);
    readonly errorMessage = signal('');
    readonly reference = signal('');
    readonly pollCount = signal(0);
    readonly paymentInstructions = signal<PaymentInstructions | null>(null);
    readonly copyingLipaNumber = signal(false);
    readonly copyMessage = signal('');
    readonly successDetails = signal<PaymentSuccessDetails | null>(null);

    readonly paymentForm = new FormGroup({
        phoneNumber: new FormControl('', [
            Validators.required,
            Validators.pattern(SUBSCRIBER_PHONE_PATTERN)
        ])
    });

    private pollingSubscription?: Subscription;
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    readonly packageService = inject(PackageService);
    private readonly paymentService = inject(PaymentService);
    readonly tenantService = inject(TenantService);
    private readonly wifiContextService = inject(WifiContextService);
    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        this.destroyRef.onDestroy(() => this.stopPolling());
    }

    ngOnInit(): void {
        const companySlug = this.route.snapshot.paramMap.get('companySlug');
        const packageId = Number(this.route.snapshot.paramMap.get('packageId'));

        if (!companySlug) {
            this.errorMessage.set('The Wi-Fi provider could not be identified.');
            this.loadingPackage.set(false);
            return;
        }

        this.wifiContextService.capture(companySlug, this.route.snapshot.queryParamMap);

        if (!Number.isInteger(packageId) || packageId <= 0) {
            this.errorMessage.set('The selected package is invalid. Please choose a package again.');
            this.loadingPackage.set(false);
            return;
        }

        this.tenantService.setCompanySlug(companySlug);
        this.tenantService.loadCompany(companySlug).subscribe({
            next: () => this.loadPackage(companySlug, packageId),
            error: () => {
                this.errorMessage.set('This Wi-Fi provider is currently unavailable.');
                this.loadingPackage.set(false);
            }
        });
    }

    ngOnDestroy(): void {
        this.stopPolling();
    }

    private loadPackage(companySlug: string, packageId: number): void {
        this.packageService.getPackageById(companySlug, packageId).subscribe({
            next: packageItem => {
                if (!packageItem) {
                    this.errorMessage.set('This package is no longer available. Please choose another package.');
                    this.loadingPackage.set(false);
                    return;
                }

                this.packageItem.set(packageItem);
                this.packageService.selectPackage(packageItem);
                this.loadingPackage.set(false);
            },
            error: error => {
                console.error('Failed to load package:', error);
                this.errorMessage.set('The package could not be loaded. Please return and try again.');
                this.loadingPackage.set(false);
            }
        });
    }

    async copyLipaNumber(): Promise<void> {
        const number = this.paymentInstructions()?.lipa_number;
        if (!number || this.copyingLipaNumber()) return;

        this.copyingLipaNumber.set(true);
        this.copyMessage.set('');
        try {
            try {
                await navigator.clipboard.writeText(number);
            } catch {
                // Some captive-portal browsers do not expose the Clipboard API.
                const input = document.createElement('textarea');
                const previousFocus = document.activeElement;
                input.value = number;
                input.readOnly = true;
                input.style.cssText = 'position:fixed;left:-9999px;top:0;font-size:16px';
                document.body.appendChild(input);
                try {
                    input.select();
                    input.setSelectionRange(0, number.length);
                    if (!document.execCommand('copy')) throw new Error('Copy unavailable');
                } finally {
                    input.remove();
                    if (previousFocus instanceof HTMLElement) previousFocus.focus();
                }
            }
            this.copyMessage.set('Lipa number copied.');
        } catch {
            this.copyMessage.set('Could not copy. Press and hold the Lipa number to copy it.');
        } finally {
            this.copyingLipaNumber.set(false);
        }
    }

    initiatePayment(): void {
        this.paymentForm.markAllAsTouched();
        const packageItem = this.packageItem();

        if (this.paymentForm.invalid || !packageItem || this.submitting() || this.waiting()) {
            return;
        }

        const companySlug = this.tenantService.requireSlug();
        const wifi = this.wifiContextService.get(companySlug);

        if (!wifi) {
            this.errorMessage.set('Wi-Fi connection information is missing. Reconnect to the Wi-Fi and open the captive portal again.');
            return;
        }

        this.submitting.set(true);
        this.failed.set(false);
        this.timedOut.set(false);
        this.approved.set(false);
        this.errorMessage.set('');
        this.paymentInstructions.set(null);
        this.copyMessage.set('');
        this.successDetails.set(null);

        const phoneNumber = toInternationalPhone(this.paymentForm.controls.phoneNumber.value!);

        this.paymentService.initiatePayment({
            package_id: packageItem.id,
            payment_method: 'lipa',
            phone_number: phoneNumber,
            mac: wifi.mac,
            ip: wifi.ip,
            router: wifi.router,
            login_url: wifi.loginUrl
        }).subscribe({
            next: response => {
                const transactionReference = response.payment?.transaction_reference;

                if (!transactionReference) {
                    this.submitting.set(false);
                    this.errorMessage.set('The payment request did not return a reference. Please try again.');
                    return;
                }

                if (!response.payment_instructions?.lipa_number) {
                    this.submitting.set(false);
                    this.errorMessage.set('The Lipa number is not configured for this Wi-Fi provider.');
                    return;
                }

                this.reference.set(transactionReference);
                this.paymentInstructions.set(response.payment_instructions);
                this.submitting.set(false);
                this.waiting.set(true);
                this.startPolling(transactionReference);
            },
            error: error => {
                console.error('Payment initiation failed:', error);
                this.submitting.set(false);
                this.errorMessage.set(
                    error?.error?.message ||
                    'Payment could not be started. Check your connection and try again.'
                );
            }
        });
    }

    retryPayment(): void {
        this.stopPolling();
        this.waiting.set(false);
        this.failed.set(false);
        this.timedOut.set(false);
        this.approved.set(false);
        this.reference.set('');
        this.pollCount.set(0);
        this.paymentInstructions.set(null);
        this.copyMessage.set('');
        this.successDetails.set(null);
        this.errorMessage.set('');
    }

    retryStatusCheck(): void {
        if (!this.reference()) {
            this.retryPayment();
            return;
        }

        this.failed.set(false);
        this.timedOut.set(false);
        this.errorMessage.set('');
        this.waiting.set(true);
        this.startPolling(this.reference());
    }

    goToCashPayment(): void {
        const packageItem = this.packageItem();
        const companySlug = this.tenantService.companySlug();

        if (!packageItem || !companySlug) {
            this.errorMessage.set('The selected package or Wi-Fi provider is unavailable.');
            return;
        }

        const wifi = this.wifiContextService.get(companySlug);

        if (!wifi) {
            this.errorMessage.set('Wi-Fi connection information is missing. Reconnect to the Wi-Fi and open the captive portal again.');
            return;
        }

        this.stopPolling();

        void this.router.navigate(
            ['/', companySlug, 'cash-payment', packageItem.id],
            {
                queryParams: {
                    mac: wifi.mac,
                    ip: wifi.ip,
                    loginUrl: wifi.loginUrl,
                    originalUrl: wifi.originalUrl,
                    router: wifi.router
                }
            }
        );
    }

    continueBrowsing(): void {
        const companySlug = this.tenantService.companySlug();
        const wifi = companySlug ? this.wifiContextService.get(companySlug) : null;
        const originalUrl = wifi?.originalUrl?.trim();

        if (originalUrl) {
            try {
                const url = new URL(originalUrl);
                if (url.protocol === 'http:' || url.protocol === 'https:') {
                    window.location.assign(url.toString());
                    return;
                }
            } catch {
                // Fall through to a neutral public page when originalUrl is malformed.
            }
        }

        window.location.assign('https://www.google.com');
    }

    private startPolling(reference: string): void {
        this.stopPolling();
        this.pollCount.set(0);

        this.pollingSubscription = interval(PAYMENT_POLL_INTERVAL_MS)
            .pipe(
                startWith(0),
                switchMap(() => this.paymentService.getPaymentStatus(reference))
            )
            .subscribe({
                next: response => {
                    this.pollCount.update(count => count + 1);
                    const status = response.payment?.status?.toLowerCase();

                    if (!status) {
                        this.errorMessage.set('Payment status could not be read.');
                        this.waiting.set(false);
                        this.stopPolling();
                        return;
                    }

                    if (['successful', 'success', 'paid'].includes(status)) {
                        this.handleSuccessfulPayment(response);
                        return;
                    }

                    if (['failed', 'cancelled', 'rejected'].includes(status)) {
                        this.failed.set(true);
                        this.waiting.set(false);
                        this.stopPolling();
                        return;
                    }

                    if (this.pollCount() >= MAX_PAYMENT_POLLS) {
                        this.timedOut.set(true);
                        this.waiting.set(false);
                        this.stopPolling();
                    }
                },
                error: error => {
                    console.error('Payment status check failed:', error);
                    this.errorMessage.set('We could not check the payment status. Your payment record is safe; retry the status check.');
                    this.waiting.set(false);
                    this.stopPolling();
                }
            });
    }

    private handleSuccessfulPayment(response: PaymentStatusResponse): void {
        const packageItem = this.packageItem();

        if (!packageItem) {
            this.errorMessage.set('Payment succeeded, but package information could not be loaded.');
            this.waiting.set(false);
            this.stopPolling();
            return;
        }

        const payment = response.payment;
        const session = response.session;
        const details: PaymentSuccessDetails = {
            reference: payment?.transaction_reference || this.reference(),
            packageName: session?.package_name || packageItem.name,
            amount: Number(session?.amount_paid ?? payment?.amount ?? packageItem.price),
            paymentMethod: session?.payment_method || payment?.payment_method || 'Lipa',
            phoneNumber: session?.phone_number || payment?.phone_number || this.paymentForm.controls.phoneNumber.value!,
            startedAt: session?.started_at || new Date().toISOString(),
            expiresAt: session?.expires_at || this.estimatedExpiry(packageItem.duration_minutes),
            sessionId: session?.id,
            status: session?.status || 'active'
        };

        this.paymentService.rememberSuccess(details);
        this.successDetails.set(details);
        this.stopPolling();
        this.waiting.set(false);
        this.approved.set(true);
    }

    private stopPolling(): void {
        this.pollingSubscription?.unsubscribe();
        this.pollingSubscription = undefined;
    }

    private estimatedExpiry(durationMinutes: number): string {
        return new Date(Date.now() + durationMinutes * 60_000).toISOString();
    }
}
