// Import Angular HTTP client
import {
    HttpClient
} from '@angular/common/http';


// Import Angular dependency injection and signals
import {
    Injectable,
    signal
} from '@angular/core';


// Import RxJS Observable
import {
    Observable
} from 'rxjs';


// Import tenant-aware public API builder
import {
    getCompanyPublicApiUrl
} from '../config/api.config';


// Import payment models
import {
    PaymentInitiationRequest,
    PaymentInitiationResponse,
    PaymentStatusResponse,
    PaymentSuccessDetails
} from '../models/payment.model';


// Import tenant service
import {
    TenantService
} from './tenant.service';


@Injectable({
    providedIn: 'root'
})
export class PaymentService {

    // Keep the most recent successful payment details
    // so the success page can survive route changes or refreshes
    private readonly lastSuccessState =
        signal<PaymentSuccessDetails | null>(
            this.restoreSuccess()
        );


    // Expose successful payment details as read-only state
    readonly lastSuccess =
        this.lastSuccessState.asReadonly();


    // Inject backend HTTP client and current tenant service
    constructor(
        private readonly http: HttpClient,
        private readonly tenantService: TenantService
    ) {}


    // Start a mobile-money payment for the current company
    //
    // The frontend deliberately does NOT send the package price.
    // The backend reads the trusted package price from PostgreSQL.
    initiatePayment(
        payload: PaymentInitiationRequest
    ): Observable<PaymentInitiationResponse> {

        // Get the company currently being served by this portal
        const companySlug =
            this.tenantService.requireSlug();


        // Build company-specific payment endpoint
        const url =
            `${getCompanyPublicApiUrl(companySlug)}/payments/initiate`;


        // Send payment request
        return this.http.post<PaymentInitiationResponse>(
            url,
            payload
        );
    }


    // Check the current payment status for the current company
    getPaymentStatus(
        reference: string
    ): Observable<PaymentStatusResponse> {

        // Get current company context
        const companySlug =
            this.tenantService.requireSlug();


        // Protect the payment reference before putting it into the URL
        const encodedReference =
            encodeURIComponent(reference);


        // Build company-specific payment status endpoint
        const url =
            `${getCompanyPublicApiUrl(companySlug)}/payments/${encodedReference}/status`;


        // Request payment status
        return this.http.get<PaymentStatusResponse>(
            url
        );
    }


    // Remember successful payment details
    rememberSuccess(
        details: PaymentSuccessDetails
    ): void {

        // Save in Angular application state
        this.lastSuccessState.set(
            details
        );


        // Preserve payment success during browser refresh
        sessionStorage.setItem(
            'y4c-payment-success',
            JSON.stringify(details)
        );
    }


    // Create a cash-payment request for the current company
    //
    // Price is deliberately not sent.
    // The backend reads the trusted price from PostgreSQL.
    initiateCashPayment(
        payload: {
            package_id: number;
            phone_number: string;
            mac: string;
            ip: string;
            router: string;
            login_url: string;
        }
    ): Observable<any> {

        // Get current company context
        const companySlug =
            this.tenantService.requireSlug();


        // Build company-specific cash-payment endpoint
        const url =
            `${getCompanyPublicApiUrl(companySlug)}/payments/cash-request`;


        // Create cash-payment request
        return this.http.post<any>(
            url,
            payload
        );
    }


    // Restore successful payment details after browser refresh
    private restoreSuccess():
        PaymentSuccessDetails | null {

        try {

            // Read saved payment success details
            const stored =
                sessionStorage.getItem(
                    'y4c-payment-success'
                );


            // Return parsed details when available
            return stored
                ? JSON.parse(
                    stored
                ) as PaymentSuccessDetails
                : null;

        } catch {

            // Ignore corrupted browser storage
            return null;
        }
    }
}