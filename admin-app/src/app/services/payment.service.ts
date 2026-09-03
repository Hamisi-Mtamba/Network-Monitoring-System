import {
    inject,
    Injectable
} from '@angular/core';

import {
    HttpClient
} from '@angular/common/http';

import {
    Observable
} from 'rxjs';

import {
    API_CONFIG
} from '../config/api.config';

import {
    CompanyPaymentDetailsResponse,
    CompanyPaymentsResponse,
    Payment,
    PaymentInternetSession,
    PaymentListResponse,
    PaymentResponse
} from '../models/payment.model';


/* =========================================================
   CASH PAYMENT API RESPONSES
   ========================================================= */

/**
 * Response returned when the current company admin
 * loads cash-payment requests waiting for confirmation.
 */
export interface CashPaymentRequestsResponse {

    success: boolean;

    cash_requests: Payment[];
}


/**
 * Response returned after a company administrator
 * confirms that physical cash was received.
 */
export interface CashPaymentConfirmationResponse {

    success: boolean;

    already_confirmed?: boolean;

    message: string;

    payment: Payment;

    session: PaymentInternetSession;
}


/* =========================================================
   PAYMENT SERVICE
   ========================================================= */

@Injectable({
    providedIn: 'root'
})
export class PaymentService {

    private readonly http =
        inject(HttpClient);


    // =====================================================
    // NORMAL COMPANY ADMIN URL
    // =====================================================

    private readonly url =
        `${API_CONFIG.baseUrl}/payments`;


    // =====================================================
    // NORMAL COMPANY ADMIN - ALL PAYMENTS
    // =====================================================

    getPayments():
        Observable<PaymentListResponse> {

        return this.http.get<PaymentListResponse>(
            this.url
        );
    }


    // =====================================================
    // NORMAL COMPANY ADMIN - PAYMENT DETAILS
    // =====================================================

    getPayment(
        id: number
    ): Observable<PaymentResponse> {

        return this.http.get<PaymentResponse>(
            `${this.url}/${id}`
        );
    }


    // =====================================================
    // NORMAL COMPANY ADMIN - CASH REQUESTS
    // =====================================================

    /**
     * Load all cash payments belonging to the
     * authenticated company that are still waiting
     * for administrator confirmation.
     *
     * GET
     * /api/admin/payments/cash-requests
     *
     * Expected payment status:
     *
     * awaiting_cash_confirmation
     */
    getCashRequests():
        Observable<CashPaymentRequestsResponse> {

        return this.http.get<CashPaymentRequestsResponse>(
            `${this.url}/cash-requests`
        );
    }


    // =====================================================
    // NORMAL COMPANY ADMIN - CONFIRM CASH PAYMENT
    // =====================================================

    /**
     * Confirm that the company administrator has
     * physically received cash from the customer.
     *
     * Backend behavior:
     *
     * 1. Validates the payment belongs to this company.
     * 2. Verifies the payment method is cash.
     * 3. Verifies it is awaiting confirmation.
     * 4. Marks the payment successful.
     * 5. Sets paid_at.
     * 6. Creates the customer's internet session.
     *
     * PATCH
     * /api/admin/payments/cash-requests/:reference/confirm
     */
    confirmCashPayment(
        reference: string
    ): Observable<CashPaymentConfirmationResponse> {

        const encodedReference =
            encodeURIComponent(
                reference.trim()
            );


        return this.http.patch<CashPaymentConfirmationResponse>(
            `${this.url}/cash-requests/${encodedReference}/confirm`,
            {}
        );
    }


    // =====================================================
    // DEVELOPMENT PAYMENT SIMULATION
    // =====================================================

    /**
     * Development-only helper for simulating
     * successful NON-CASH payments.
     *
     * Cash payments are rejected by the backend
     * and must go through confirmCashPayment().
     */
    markSuccessfulForDevelopment(
        reference: string
    ): Observable<PaymentResponse> {

        const encodedReference =
            encodeURIComponent(
                reference.trim()
            );


        return this.http.patch<PaymentResponse>(
            `${this.url}/${encodedReference}/success`,
            {}
        );
    }


    // =====================================================
    // SUPERADMIN - COMPANY PAYMENTS
    // =====================================================

    /**
     * Load all payments belonging to the company
     * currently selected by the Superadmin.
     *
     * GET
     * /api/platform/companies/:companyId/payments
     */
    getCompanyPayments(
        companyId: number
    ): Observable<CompanyPaymentsResponse> {

        return this.http.get<CompanyPaymentsResponse>(
            `${API_CONFIG.platformUrl}/companies/${companyId}/payments`
        );
    }


    // =====================================================
    // SUPERADMIN - COMPANY PAYMENT DETAILS
    // =====================================================

    /**
     * Load one payment belonging to the selected
     * company together with its internet session
     * when one exists.
     *
     * GET
     * /api/platform/companies/:companyId/payments/:paymentId
     */
    getCompanyPayment(
        companyId: number,
        paymentId: number
    ): Observable<CompanyPaymentDetailsResponse> {

        return this.http.get<CompanyPaymentDetailsResponse>(
            `${API_CONFIG.platformUrl}/companies/${companyId}/payments/${paymentId}`
        );
    }
}