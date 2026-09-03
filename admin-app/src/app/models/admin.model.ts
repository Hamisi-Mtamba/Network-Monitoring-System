// =========================================================
// ADMIN ROLES
// =========================================================

/**
 * Administrator roles supported by the multi-tenant backend.
 */
export type AdminRole =
    'admin' |
    'superadmin';


// =========================================================
// ADMIN ACCOUNT
// =========================================================

/**
 * Administrator account returned by the backend.
 */
export interface Admin {

    // Unique administrator ID
    id: number;

    // Normal admins belong to a company.
    // Superadmin has no company.
    company_id?: number | null;

    // Administrator display name
    name: string;

    // Administrator email
    email: string;

    // Administrator role
    role: AdminRole;

    // Backend account status
    status?: string;

    // Legacy/backend compatibility field
    is_active?: boolean;

    // Account creation date
    created_at?: string;
}


// =========================================================
// AUTHENTICATION
// =========================================================

export interface LoginRequest {

    email: string;

    password: string;
}


export interface LoginResponse {

    success: boolean;

    message: string;

    token: string;

    admin: Admin;
}


/**
 * Response returned by:
 *
 * GET /api/admin/auth/me
 */
export interface AdminResponse {

    success: boolean;

    admin: Admin;
}


// =========================================================
// COMPANY ADMIN LIST RESPONSE
// =========================================================

/**
 * Small company object returned alongside a company's admins.
 */
export interface AdminCompanySummary {

    id: number;

    name: string;

    status: string;
}


/**
 * Response returned by:
 *
 * GET /api/platform/companies/:companyId/admins
 */
export interface CompanyAdminsResponse {

    success: boolean;

    company: AdminCompanySummary;

    admins: Admin[];
}


// =========================================================
// COMPANY ADMIN ACTION RESPONSE
// =========================================================

/**
 * Shared response shape returned after creating,
 * updating, suspending, activating, deleting,
 * or changing the password of a company admin.
 */
export interface CompanyAdminResponse {

    success: boolean;

    message: string;

    admin: Admin;
}


// =========================================================
// CREATE COMPANY ADMIN
// =========================================================

/**
 * Request body for:
 *
 * POST /api/platform/companies/:companyId/admins
 */
export interface CreateCompanyAdminRequest {

    name: string;

    email: string;

    password: string;
}


// =========================================================
// UPDATE COMPANY ADMIN
// =========================================================

/**
 * Request body for:
 *
 * PATCH /api/platform/companies/:companyId/admins/:adminId
 */
export interface UpdateCompanyAdminRequest {

    name?: string;

    email?: string;
}


// =========================================================
// CHANGE ADMIN PASSWORD
// =========================================================

/**
 * Request body for:
 *
 * PATCH
 * /api/platform/companies/:companyId/admins/:adminId/password
 */
export interface ChangeCompanyAdminPasswordRequest {

    password: string;
}