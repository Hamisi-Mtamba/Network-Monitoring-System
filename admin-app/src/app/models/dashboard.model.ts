/* =========================================================
   COMPANY ADMIN DASHBOARD
   ========================================================= */

/**
 * Dashboard statistics for a normal company administrator.
 *
 * These values are scoped by the backend to the
 * authenticated administrator's company.
 */
export interface DashboardStats {

    total_packages: number;

    total_payments: number;

    successful_payments: number;

    pending_payments: number;

    active_sessions: number;

    expired_sessions: number;

    total_revenue: number | string;
}


/**
 * Response returned by:
 *
 * GET /api/admin/dashboard
 */
export interface DashboardResponse {

    success: boolean;

    dashboard: DashboardStats;
}


/* =========================================================
   SUPERADMIN PLATFORM DASHBOARD
   ========================================================= */

/**
 * Platform-wide statistics visible only to Superadmin.
 *
 * These values summarize all companies in the platform.
 */
export interface PlatformDashboardStats {

    // Companies
    total_companies: number;

    active_companies: number;

    suspended_companies: number;


    // Administrators
    total_company_admins: number;

    total_superadmins: number;


    // Packages
    total_packages: number;


    // Payments
    total_payments: number;

    successful_payments: number;

    pending_payments: number;

    total_revenue: number | string;


    // Internet sessions
    total_sessions: number;

    active_sessions: number;

    expired_sessions: number;
}


/* =========================================================
   RECENT COMPANY
   ========================================================= */

/**
 * Small company summary returned with the
 * Superadmin platform dashboard.
 */
export interface PlatformRecentCompany {

    id: number;

    name: string;

    slug: string;

    logo_url: string | null;

    status: string;

    created_at: string;

    admin_count: number;

    package_count: number;
}


/* =========================================================
   PLATFORM DASHBOARD RESPONSE
   ========================================================= */

/**
 * Response returned by:
 *
 * GET /api/platform/dashboard
 */
export interface PlatformDashboardResponse {

    success: boolean;

    dashboard: PlatformDashboardStats;

    recent_companies: PlatformRecentCompany[];
}