// Import PostgreSQL connection pool
import { pool } from "../../database/database.js";


// Get all payments belonging to a company selected by Superadmin
const getCompanyPayments = async (req, res) => {
    try {
        // Get selected company ID
        const companyId = Number(req.params.companyId);

        // Validate company ID
        if (!Number.isInteger(companyId) || companyId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid company ID"
            });
        }

        // Verify company exists
        const companyResult = await pool.query(
            `
            SELECT
                id,
                name,
                status
            FROM companies
            WHERE id = $1
            LIMIT 1
            `,
            [companyId]
        );

        // Stop if company does not exist
        if (companyResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }

        // Fetch only selected company's payments
        const result = await pool.query(
            `
            SELECT
                pay.id,
                pay.company_id,
                pay.package_id,
                pay.phone_number,
                pay.payment_method,
                pay.amount,
                pay.transaction_reference,
                pay.status,
                pay.created_at,
                pay.paid_at,
                p.name AS package_name,
                p.duration_minutes,
                p.speed
            FROM payments pay
            JOIN packages p
                ON p.id = pay.package_id
               AND p.company_id = pay.company_id
            WHERE pay.company_id = $1
            ORDER BY pay.created_at DESC
            `,
            [companyId]
        );

        // Return company and payment information
        res.status(200).json({
            success: true,
            company: companyResult.rows[0],
            payments: result.rows
        });

    } catch (error) {
        // Log actual backend error
        console.error("Get company payments error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch company payments"
        });
    }
};


// Get one payment belonging to a company selected by Superadmin
const getCompanyPaymentById = async (req, res) => {
    try {
        // Get company and payment IDs
        const companyId = Number(req.params.companyId);
        const paymentId = Number(req.params.paymentId);

        // Validate IDs
        if (
            !Number.isInteger(companyId) ||
            companyId <= 0 ||
            !Number.isInteger(paymentId) ||
            paymentId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid company or payment ID"
            });
        }

        // Fetch payment only inside selected company
        const paymentResult = await pool.query(
            `
            SELECT
                pay.id,
                pay.company_id,
                pay.package_id,
                pay.phone_number,
                pay.payment_method,
                pay.amount,
                pay.transaction_reference,
                pay.status,
                pay.created_at,
                pay.paid_at,
                p.name AS package_name,
                p.duration_minutes,
                p.speed
            FROM payments pay
            JOIN packages p
                ON p.id = pay.package_id
               AND p.company_id = pay.company_id
            WHERE pay.id = $1
              AND pay.company_id = $2
            LIMIT 1
            `,
            [
                paymentId,
                companyId
            ]
        );

        // Stop if payment belongs elsewhere
        if (paymentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }

        // Fetch related tenant-owned session
        const sessionResult = await pool.query(
            `
            SELECT *
            FROM internet_sessions
            WHERE payment_id = $1
              AND company_id = $2
            ORDER BY id DESC
            LIMIT 1
            `,
            [
                paymentId,
                companyId
            ]
        );

        // Return result
        res.status(200).json({
            success: true,
            payment: paymentResult.rows[0],
            session:
                sessionResult.rows.length > 0
                    ? sessionResult.rows[0]
                    : null
        });

    } catch (error) {
        // Log actual backend error
        console.error("Get company payment error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch company payment"
        });
    }
};


// Export platform payment controllers
export {
    getCompanyPayments,
    getCompanyPaymentById
};