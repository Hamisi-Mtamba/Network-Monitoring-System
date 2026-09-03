// Import PostgreSQL connection pool
import { pool } from "../../database/database.js";


// Resolve the company that the current request is allowed to manage
const getRequestCompanyId = (req) => {

    // Superadmin manages an explicitly selected company
    if (
        req.admin.role === "superadmin" &&
        req.platformCompany
    ) {
        return req.platformCompany.id;
    }

    // Normal admin uses their authenticated company
    return req.admin.companyId;
};


// Get revenue report for one company
const getRevenueReport = async (req, res) => {
    try {
        // Get trusted company ID
        const companyId = getRequestCompanyId(req);

        // Stop if company context is missing
        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: "Company context is required"
            });
        }

        // Get successful payment revenue grouped by date
        const result = await pool.query(
            `
            SELECT
                DATE(paid_at) AS date,
                COUNT(*) AS successful_payments,
                COALESCE(SUM(amount), 0) AS revenue
            FROM payments
            WHERE company_id = $1
            AND status = 'successful'
            AND paid_at IS NOT NULL
            GROUP BY DATE(paid_at)
            ORDER BY DATE(paid_at) DESC
            `,
            [companyId]
        );

        // Convert PostgreSQL numeric values
        const report = result.rows.map((row) => ({
            date: row.date,
            successful_payments:
                Number(row.successful_payments),
            revenue:
                Number(row.revenue)
        }));

        // Calculate total company revenue
        const totalResult = await pool.query(
            `
            SELECT
                COALESCE(SUM(amount), 0) AS total_revenue
            FROM payments
            WHERE company_id = $1
            AND status = 'successful'
            `,
            [companyId]
        );

        // Return revenue report
        res.status(200).json({
            success: true,
            total_revenue:
                Number(totalResult.rows[0].total_revenue),
            report
        });

    } catch (error) {
        // Log actual backend error
        console.error("Revenue report error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch revenue report"
        });
    }
};


// Get payment report for one company
const getPaymentReport = async (req, res) => {
    try {
        // Get trusted company ID
        const companyId = getRequestCompanyId(req);

        // Get payment statistics grouped by payment status
        const result = await pool.query(
            `
            SELECT
                status,
                COUNT(*) AS payment_count,
                COALESCE(SUM(amount), 0) AS total_amount
            FROM payments
            WHERE company_id = $1
            GROUP BY status
            ORDER BY status ASC
            `,
            [companyId]
        );

        // Convert PostgreSQL values into normal JavaScript numbers
        const report = result.rows.map((row) => ({
            status: row.status,
            payment_count:
                Number(row.payment_count),
            total_amount:
                Number(row.total_amount)
        }));

        // Return company-specific payment report
        res.status(200).json({
            success: true,
            report
        });

    } catch (error) {
        // Log actual backend error
        console.error("Payment report error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch payment report"
        });
    }
};


// Get internet session report for one company
const getSessionReport = async (req, res) => {
    try {
        // Get trusted company ID
        const companyId = getRequestCompanyId(req);

        // Group sessions using their effective status
        const result = await pool.query(
            `
            SELECT
                effective_status AS status,
                COUNT(*) AS session_count
            FROM (
                SELECT
                    CASE
                        WHEN status = 'active'
                        AND expires_at <= CURRENT_TIMESTAMP
                        THEN 'expired'

                        ELSE status
                    END AS effective_status

                FROM internet_sessions

                WHERE company_id = $1
            ) sessions

            GROUP BY effective_status
            ORDER BY effective_status ASC
            `,
            [companyId]
        );

        // Convert count values into normal JavaScript numbers
        const report = result.rows.map((row) => ({
            status: row.status,
            session_count:
                Number(row.session_count)
        }));

        // Return company-specific session report
        res.status(200).json({
            success: true,
            report
        });

    } catch (error) {
        // Log actual backend error
        console.error("Session report error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch session report"
        });
    }
};


// Export report controllers
export {
    getRevenueReport,
    getPaymentReport,
    getSessionReport
};