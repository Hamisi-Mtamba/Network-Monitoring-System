// =========================================================
// PAYMENT STATUS
// =========================================================

export type PaymentStatus =
    'pending' |
    'successful' |
    'failed';


// =========================================================
// PAYMENT
// =========================================================

export interface Payment {

    id: number;

    // Company ownership is returned by platform endpoints.
    company_id?: number;

    package_id: number;

    transaction_reference: string;

    phone_number: string;

    payment_method: string;

    amount: number | string;

    status: PaymentStatus;

    created_at: string;

    paid_at: string | null;

    package_name: string;

    duration_minutes: number;

    speed: string;
}


// =========================================================
// NORMAL COMPANY ADMIN RESPONSES
// =========================================================

export interface PaymentListResponse {

    success: boolean;

    payments: Payment[];
}


export interface PaymentResponse {

    success: boolean;

    payment: Payment;
}


// =========================================================
// PLATFORM COMPANY SUMMARY
// =========================================================

export interface PaymentCompanySummary {

    id: number;

    name: string;

    status: string;
}


// =========================================================
// SUPERADMIN COMPANY PAYMENT LIST
// =========================================================

/**
 * Response returned by:
 *
 * GET /api/platform/companies/:companyId/payments
 */
export interface CompanyPaymentsResponse {

    success: boolean;

    company: PaymentCompanySummary;

    payments: Payment[];
}


// =========================================================
// RELATED INTERNET SESSION
// =========================================================

/**
 * Session returned together with a selected payment.
 *
 * The backend currently returns SELECT * from
 * internet_sessions, so fields are optional here to keep
 * the frontend compatible with the existing schema.
 */
export interface PaymentInternetSession {

    id: number;

    company_id?: number;

    payment_id?: number;

    package_id?: number;

    phone_number?: string;

    status?: string;

    started_at?: string | null;

    expires_at?: string | null;

    ended_at?: string | null;

    created_at?: string;

    [key: string]: unknown;
}


// =========================================================
// SUPERADMIN PAYMENT DETAIL RESPONSE
// =========================================================

/**
 * Response returned by:
 *
 * GET
 * /api/platform/companies/:companyId/payments/:paymentId
 */
export interface CompanyPaymentDetailsResponse {

    success: boolean;

    payment: Payment;

    session: PaymentInternetSession | null;
}
// =========================================================
// AUTOMATIC PAYMENT SMS REVIEW
// =========================================================

export interface PaymentSmsReview {
    id: number;
    sender: string | null;
    raw_message: string;
    provider: string | null;
    provider_transaction_id: string | null;
    payer_phone: string | null;
    amount: number | string | null;
    received_at: string;
    processing_status: string;
    processing_error: string | null;
    payment_id: number | null;
    device_name: string | null;
    gateway_phone: string | null;
}

export interface PendingPaymentMatchOption {
    id: number;
    transaction_reference: string;
    phone_number: string;
    amount: number | string;
    created_at: string;
    package_name: string;
}

export interface PaymentSmsReviewResponse {
    success: boolean;
    sms_reviews: PaymentSmsReview[];
    pending_payments: PendingPaymentMatchOption[];
}
