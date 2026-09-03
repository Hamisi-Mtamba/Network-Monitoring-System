// Import PostgreSQL connection pool
import { pool } from "../../database/database.js";


// Get one public session belonging to one company
const getPublicSessionById = async (req, res) => {
    try {
        // Get company slug from URL
        const companySlug = req.params.companySlug
            ?.trim()
            .toLowerCase();

        // Get session ID
        const sessionId = Number(req.params.id);

        // Validate company slug
        if (!companySlug) {
            return res.status(400).json({
                success: false,
                message: "Company is required"
            });
        }

        // Validate session ID
        if (!Number.isInteger(sessionId) || sessionId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid session ID"
            });
        }

        // Resolve active company from the public company slug
        const companyResult = await pool.query(
            `
            SELECT
                id,
                name,
                slug,
                logo_url,
                settings
            FROM companies
            WHERE slug = $1
            AND status = 'active'
            LIMIT 1
            `,
            [companySlug]
        );

        // Stop if company does not exist or is suspended
        if (companyResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }

        // Store company
        const company = companyResult.rows[0];

        // Fetch only a session belonging to the resolved company
        const result = await pool.query(
            `
            SELECT
                s.id,
                s.company_id,
                s.payment_id,
                s.package_id,
                s.started_at,
                s.expires_at,

                CASE
                    WHEN s.status = 'active'
                    AND s.expires_at <= CURRENT_TIMESTAMP
                    THEN 'expired'
                    ELSE s.status
                END AS status,

                s.created_at,

                p.name AS package_name,
                p.speed,
                p.duration_minutes,

                pay.amount,
                pay.transaction_reference

            FROM internet_sessions s

            JOIN packages p
                ON p.id = s.package_id
                AND p.company_id = s.company_id

            JOIN payments pay
                ON pay.id = s.payment_id
                AND pay.company_id = s.company_id

            WHERE s.id = $1
            AND s.company_id = $2

            LIMIT 1
            `,
            [
                sessionId,
                company.id
            ]
        );

        // Hide sessions belonging to another company
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Internet session not found"
            });
        }

        // Return company branding and session
        res.status(200).json({
            success: true,
            company: {
                id: company.id,
                name: company.name,
                slug: company.slug,
                logo_url: company.logo_url,
                settings: company.settings
            },
            session: result.rows[0]
        });

    } catch (error) {
        // Log actual backend error
        console.error("Get public session error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch internet session"
        });
    }
};


// Export controller
export {
    getPublicSessionById
};