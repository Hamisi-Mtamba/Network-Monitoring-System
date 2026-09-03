// Import PostgreSQL connection pool
import { pool } from "../database/database.js";


// Resolve a company explicitly selected by the Superadmin
const platformCompanyContext = async (req, res, next) => {
    try {
        // Get selected company ID from URL
        const companyId = Number(req.params.companyId);

        // Validate company ID
        if (!Number.isInteger(companyId) || companyId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid company ID"
            });
        }

        // Make sure the selected company exists
        const result = await pool.query(
            `
            SELECT
                id,
                name,
                slug,
                status
            FROM companies
            WHERE id = $1
            LIMIT 1
            `,
            [companyId]
        );

        // Stop if company does not exist
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }

        // Store the explicit Superadmin tenant context
        req.platformCompany = result.rows[0];

        // Continue
        next();

    } catch (error) {
        // Log actual backend error
        console.error("Platform company context error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to load company context"
        });
    }
};


// Export middleware
export default platformCompanyContext;