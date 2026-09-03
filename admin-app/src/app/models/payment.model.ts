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