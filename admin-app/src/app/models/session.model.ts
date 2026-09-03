// =========================================================
// SESSION STATUS
// =========================================================

export type SessionStatus =
    'active' |
    'suspended' |
    'expired' |
    'failed' |
    'pending_activation';


// =========================================================
// INTERNET SESSION
// =========================================================

export interface InternetSession {

    id: number;

    // Returned by platform/company-scoped endpoints
    company_id?: number;

    started_at: string | null;

    expires_at: string | null;

    status: SessionStatus;

    created_at: string;

    package_id: number;

    package_name?: string;

    duration_minutes?: number;

    speed?: string;

    payment_id: number;

    transaction_reference?: string;

    phone_number?: string;

    payment_method?: string;

    amount?: number | string;

    // Not returned by the current shared session controller,
    // but kept optional for compatibility with older UI code.
    paid_at?: string | null;
}


// =========================================================
// NORMAL / SHARED SESSION LIST RESPONSE
// =========================================================

export interface SessionListResponse {

    success: boolean;

    sessions: InternetSession[];
}


// =========================================================
// NORMAL / SHARED SESSION RESPONSE
// =========================================================

export interface SessionResponse {

    success: boolean;

    message?: string;

    session: InternetSession;
}


// =========================================================
// UPDATE SESSION STATUS REQUEST
// =========================================================

export interface UpdateSessionStatusRequest {

    status: SessionStatus;
}


// =========================================================
// SUPERADMIN COMPANY SESSION LIST
// =========================================================

/**
 * Response returned by:
 *
 * GET /api/platform/companies/:companyId/sessions
 *
 * The platform route reuses the shared admin session
 * controller through platformCompanyContext.
 */
export interface CompanySessionsResponse {

    success: boolean;

    sessions: InternetSession[];
}


// =========================================================
// SUPERADMIN COMPANY SESSION DETAIL
// =========================================================

/**
 * Response returned by:
 *
 * GET /api/platform/companies/:companyId/sessions/:id
 */
export interface CompanySessionResponse {

    success: boolean;

    message?: string;

    session: InternetSession;
}