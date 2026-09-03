// =========================================================
// INTERNET PACKAGE
// =========================================================

export interface InternetPackage {

    id: number;

    // Company ownership is returned by platform endpoints.
    // It may be omitted by some normal admin endpoints.
    company_id?: number;

    name: string;

    price: number | string;

    duration_minutes: number;

    speed: string;

    is_active: boolean;

    available_from: string | null;

    available_until: string | null;
}


// =========================================================
// NORMAL COMPANY ADMIN PAYLOAD
// =========================================================

export interface PackagePayload {

    name: string;

    price: number;

    duration_minutes: number;

    speed: string;

    is_active?: boolean;
}


// =========================================================
// NORMAL PACKAGE RESPONSES
// =========================================================

export interface PackageListResponse {

    success: boolean;

    packages: InternetPackage[];
}


export interface PackageResponse {

    success: boolean;

    message?: string;

    package: InternetPackage;
}


// =========================================================
// PLATFORM COMPANY SUMMARY
// =========================================================

export interface PackageCompanySummary {

    id: number;

    name: string;

    status: string;
}


// =========================================================
// SUPERADMIN COMPANY PACKAGE LIST
// =========================================================

/**
 * Response returned by:
 *
 * GET /api/platform/companies/:companyId/packages
 */
export interface CompanyPackagesResponse {

    success: boolean;

    company: PackageCompanySummary;

    packages: InternetPackage[];
}


// =========================================================
// CREATE COMPANY PACKAGE
// =========================================================

/**
 * Request body for:
 *
 * POST /api/platform/companies/:companyId/packages
 */
export interface CreateCompanyPackageRequest {

    name: string;

    price: number;

    duration_minutes: number;

    speed: string;
}


// =========================================================
// UPDATE COMPANY PACKAGE
// =========================================================

/**
 * Request body for:
 *
 * PATCH /api/platform/companies/:companyId/packages/:packageId
 */
export interface UpdateCompanyPackageRequest {

    name: string;

    price: number;

    duration_minutes: number;

    speed: string;
}


// =========================================================
// UPDATE PACKAGE STATUS
// =========================================================

/**
 * Request body for:
 *
 * PATCH
 * /api/platform/companies/:companyId/packages/:packageId/status
 */
export interface UpdateCompanyPackageStatusRequest {

    is_active: boolean;
}


// =========================================================
// UPDATE PACKAGE SCHEDULE
// =========================================================

/**
 * Request body for:
 *
 * PATCH
 * /api/platform/companies/:companyId/packages/:packageId/schedule
 */
export interface UpdateCompanyPackageScheduleRequest {

    available_from: string | null;

    available_until: string | null;
}


// =========================================================
// PLATFORM PACKAGE ACTION RESPONSE
// =========================================================

/**
 * Shared response returned after creating, updating,
 * activating/deactivating, scheduling, or deleting a package.
 */
export interface CompanyPackageResponse {

    success: boolean;

    message: string;

    package: InternetPackage;
}