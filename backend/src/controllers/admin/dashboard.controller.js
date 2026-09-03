// Import PostgreSQL connection pool
import { pool } from "../../database/database.js";


// Resolve the company that the current request is allowed to manage
const getRequestCompanyId = (req) => {

    // Superadmin manages the company explicitly selected in the platform URL
    if (
        req.admin.role === "superadmin" &&
        req.platformCompany
    ) {
        return req.platformCompany.id;
    }

    // Normal admin always manages their authenticated company
    return req.admin.companyId;
};


// Get dashboard statistics for one company
const getDashboard = async (req, res) => {
    try {
        // Get the trusted company ID
        const companyId = getRequestCompanyId(req);

        // Stop if company context is missing
        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: "Company context is required"
            });
        }

        // Count all packages belonging to this company
        const packagesResult = await pool.query(
            `
            SELECT COUNT(*) AS total
            FROM packages
            WHERE company_id = $1
            `,
            [companyId]
        );

        // Count all payments belonging to this company
        const paymentsResult = await pool.query(
            `
            SELECT COUNT(*) AS total
            FROM payments
            WHERE company_id = $1
            `,
            [companyId]
        );

        // Count successful payments belonging to this company
        const successfulPaymentsResult = await pool.query(
            `
            SELECT COUNT(*) AS total
            FROM payments
            WHERE company_id = $1
            AND status = 'successful'
            `,
            [companyId]
        );

        // Count pending payment requests belonging to this company
        const pendingPaymentsResult = await pool.query(
            `
            SELECT COUNT(*) AS total
            FROM payments
            WHERE company_id = $1
            AND status IN (
                'pending',
                'awaiting_cash_confirmation'
            )
            `,
            [companyId]
        );

        // Count currently active sessions
        // A session is only considered active when it has not expired
        const activeSessionsResult = await pool.query(
            `
            SELECT COUNT(*) AS total
            FROM internet_sessions
            WHERE company_id = $1
            AND status = 'active'
            AND expires_at > CURRENT_TIMESTAMP
            `,
            [companyId]
        );

        // Count expired sessions
        // This includes sessions whose stored status is expired
        // and active sessions whose expiry time has already passed
        const expiredSessionsResult = await pool.query(
            `
            SELECT COUNT(*) AS total
            FROM internet_sessions
            WHERE company_id = $1
            AND (
                status = 'expired'
                OR (
                    status = 'active'
                    AND expires_at <= CURRENT_TIMESTAMP
                )
            )
            `,
            [companyId]
        );

        // Calculate revenue only from successful payments
        const revenueResult = await pool.query(
            `
            SELECT
                COALESCE(SUM(amount), 0) AS total
            FROM payments
            WHERE company_id = $1
            AND status = 'successful'
            `,
            [companyId]
        );

        // Convert PostgreSQL count values to normal JavaScript numbers
        const dashboard = {
            total_packages:
                Number(packagesResult.rows[0].total),

            total_payments:
                Number(paymentsResult.rows[0].total),

            successful_payments:
                Number(successfulPaymentsResult.rows[0].total),

            pending_payments:
                Number(pendingPaymentsResult.rows[0].total),

            active_sessions:
                Number(activeSessionsResult.rows[0].total),

            expired_sessions:
                Number(expiredSessionsResult.rows[0].total),

            total_revenue:
                Number(revenueResult.rows[0].total)
        };

        // Return company-specific dashboard statistics
        res.status(200).json({
            success: true,
            dashboard
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Get dashboard error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard statistics"
        });
    }
};


// Export dashboard controller
export {
    getDashboard
};