// Import PostgreSQL connection pool
import { pool } from "../../database/database.js";


// Get publicly available packages for one company
const getPublicPackages = async (req, res) => {
    try {
        // Get company slug from the public URL
        const companySlug = req.params.companySlug
            ?.trim()
            .toLowerCase();

        // Validate company slug
        if (!companySlug) {
            return res.status(400).json({
                success: false,
                message: "Company is required"
            });
        }

        // Find an active company using the public slug
        const companyResult = await pool.query(
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

        // Return 404 for missing, inactive or suspended companies
        if (companyResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }

        // Store the resolved company
        const company = companyResult.rows[0];

        // Fetch only active and currently available packages
        // belonging to the resolved company
        const result = await pool.query(
            `
            SELECT
                id,
                company_id,
                name,
                price,
                duration_minutes,
                speed,
                is_active,
                available_from,
                available_until
            FROM packages
            WHERE company_id = $1
              AND is_active = TRUE
              AND (
                    available_from IS NULL
                    OR available_from <= CURRENT_TIMESTAMP
                  )
              AND (
                    available_until IS NULL
                    OR available_until >= CURRENT_TIMESTAMP
                  )
            ORDER BY price ASC, id ASC
            `,
            [company.id]
        );

        // Return company branding and company-specific packages
        res.status(200).json({
            success: true,
            company: {
                id: company.id,
                name: company.name,
                slug: company.slug,
                logo_url: company.logo_url,
                email: company.email,
                phone: company.phone,
                address: company.address,
                settings: company.settings
            },
            packages: result.rows
        });

    } catch (error) {
        // Log actual backend error
        console.error("Get public packages error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch packages"
        });
    }
};


// Export public package controller
export {
    getPublicPackages
};