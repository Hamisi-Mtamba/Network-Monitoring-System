// Import PostgreSQL connection pool
import {
    pool
} from "../../database/database.js";


/* =========================================================
   PLATFORM DASHBOARD
   =========================================================
 *
 * Provides platform-wide statistics for the Superadmin.
 *
 * This endpoint is NOT scoped to one company.
 *
 * It summarizes:
 * - companies
 * - administrators
 * - packages
 * - payments
 * - sessions
 *
 * ========================================================= */


/**
 * Get platform-wide dashboard statistics.
 *
 * Used only by the authenticated Superadmin.
 */
const getPlatformDashboard = async (req, res) => {

    try {

        // =====================================================
        // COMPANY STATISTICS
        // =====================================================

        const companyResult =
            await pool.query(
                `
                SELECT
                    COUNT(*)::int
                        AS total_companies,

                    COUNT(*) FILTER (
                        WHERE status = 'active'
                    )::int
                        AS active_companies,

                    COUNT(*) FILTER (
                        WHERE status = 'suspended'
                    )::int
                        AS suspended_companies

                FROM companies
                `
            );


        // =====================================================
        // ADMINISTRATOR STATISTICS
        // =====================================================

        const adminResult =
            await pool.query(
                `
                SELECT
                    COUNT(*) FILTER (
                        WHERE role = 'admin'
                    )::int
                        AS total_company_admins,

                    COUNT(*) FILTER (
                        WHERE role = 'superadmin'
                    )::int
                        AS total_superadmins

                FROM admins
                `
            );


        // =====================================================
        // PACKAGE STATISTICS
        // =====================================================

        const packageResult =
            await pool.query(
                `
                SELECT
                    COUNT(*)::int
                        AS total_packages

                FROM packages
                `
            );


        // =====================================================
        // PAYMENT STATISTICS
        // =====================================================

        const paymentResult =
            await pool.query(
                `
                SELECT
                    COUNT(*)::int
                        AS total_payments,

                    COUNT(*) FILTER (
                        WHERE status = 'successful'
                    )::int
                        AS successful_payments,

                    COUNT(*) FILTER (
                        WHERE status = 'pending'
                    )::int
                        AS pending_payments,

                    COALESCE(
                        SUM(amount) FILTER (
                            WHERE status = 'successful'
                        ),
                        0
                    )
                        AS total_revenue

                FROM payments
                `
            );


        // =====================================================
        // SESSION STATISTICS
        // =====================================================

        const sessionResult =
            await pool.query(
                `
                SELECT
                    COUNT(*)::int
                        AS total_sessions,

                    COUNT(*) FILTER (
                        WHERE status = 'active'
                    )::int
                        AS active_sessions,

                    COUNT(*) FILTER (
                        WHERE status = 'expired'
                    )::int
                        AS expired_sessions

                FROM internet_sessions
                `
            );


        // =====================================================
        // MOST RECENT COMPANIES
        // =====================================================

        const recentCompaniesResult =
            await pool.query(
                `
                SELECT
                    c.id,
                    c.name,
                    c.slug,
                    c.logo_url,
                    c.status,
                    c.created_at,

                    COUNT(
                        DISTINCT a.id
                    ) FILTER (
                        WHERE a.role = 'admin'
                    )::int
                        AS admin_count,

                    COUNT(
                        DISTINCT p.id
                    )::int
                        AS package_count

                FROM companies c

                LEFT JOIN admins a
                    ON a.company_id = c.id

                LEFT JOIN packages p
                    ON p.company_id = c.id

                GROUP BY
                    c.id

                ORDER BY
                    c.created_at DESC

                LIMIT 5
                `
            );


        // =====================================================
        // BUILD DASHBOARD RESPONSE
        // =====================================================

        const companies =
            companyResult.rows[0];


        const admins =
            adminResult.rows[0];


        const packages =
            packageResult.rows[0];


        const payments =
            paymentResult.rows[0];


        const sessions =
            sessionResult.rows[0];


        // Return platform dashboard
        res.status(200).json({

            success: true,

            dashboard: {

                // Company information
                total_companies:
                    companies.total_companies,

                active_companies:
                    companies.active_companies,

                suspended_companies:
                    companies.suspended_companies,


                // Administrator information
                total_company_admins:
                    admins.total_company_admins,

                total_superadmins:
                    admins.total_superadmins,


                // Package information
                total_packages:
                    packages.total_packages,


                // Payment information
                total_payments:
                    payments.total_payments,

                successful_payments:
                    payments.successful_payments,

                pending_payments:
                    payments.pending_payments,

                total_revenue:
                    Number(
                        payments.total_revenue ?? 0
                    ),


                // Session information
                total_sessions:
                    sessions.total_sessions,

                active_sessions:
                    sessions.active_sessions,

                expired_sessions:
                    sessions.expired_sessions
            },


            // Recent companies displayed separately
            recent_companies:
                recentCompaniesResult.rows
        });

    } catch (error) {

        // Log real backend error for development/debugging
        console.error(
            "Platform dashboard error:",
            error.message
        );


        // Return safe client-facing error
        res.status(500).json({

            success: false,

            message:
                "Failed to fetch platform dashboard"
        });
    }
};


// Export platform dashboard controller
export {
    getPlatformDashboard
};