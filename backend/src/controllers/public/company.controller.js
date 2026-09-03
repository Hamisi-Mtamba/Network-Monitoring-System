// Import PostgreSQL connection pool
import { pool } from "../../database/database.js";


// Get public profile for one active company
const getPublicCompanyProfile = async (req, res) => {
    try {
        // Get company slug
        const companySlug = req.params.companySlug
            ?.trim()
            .toLowerCase();

        // Validate slug
        if (!companySlug) {
            return res.status(400).json({
                success: false,
                message: "Company is required"
            });
        }

        // Fetch only active company information safe for public use
        const result = await pool.query(
            `
            SELECT
                id,
                name,
                slug,
                logo_url,
                email,
                phone,
                address,
                settings
            FROM companies
            WHERE slug = $1
            AND status = 'active'
            LIMIT 1
            `,
            [companySlug]
        );

        // Hide missing or suspended companies
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }

        // Return public company branding/profile
        res.status(200).json({
            success: true,
            company: result.rows[0]
        });

    } catch (error) {
        // Log actual backend error
        console.error("Get public company profile error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch company profile"
        });
    }
};


// Export controller
export {
    getPublicCompanyProfile
};