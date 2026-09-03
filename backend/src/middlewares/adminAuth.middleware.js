// Import jsonwebtoken to verify administrator authentication tokens
import jwt from "jsonwebtoken";

// Import PostgreSQL connection pool
import { pool } from "../database/database.js";


// Middleware used to authenticate both Superadmin and company administrators
const adminAuth = async (req, res, next) => {
    try {
        // Get the Authorization header sent by the frontend/Postman
        const authHeader = req.headers.authorization;

        // Stop if the Authorization header is missing
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        // Make sure Bearer authentication is being used
        if (!authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication format"
            });
        }

        // Extract the JWT from the Authorization header
        const token = authHeader.split(" ")[1];

        // Stop if the JWT is missing
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication token is missing"
            });
        }

        let decodedToken;

        try {
            // Verify that the JWT is valid and has not expired
            decodedToken = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

        } catch (error) {
            // Reject invalid or expired tokens
            return res.status(401).json({
                success: false,
                message: "Invalid or expired authentication token"
            });
        }

        // Fetch the latest administrator information from PostgreSQL
        // We deliberately do not trust companyId or role from the JWT alone
        const result = await pool.query(
            `
            SELECT
                id,
                company_id,
                name,
                email,
                role,
                status,
                is_active,
                created_at
            FROM admins
            WHERE id = $1
            LIMIT 1
            `,
            [decodedToken.adminId]
        );

        // Stop if the administrator has been deleted
        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Administrator account no longer exists"
            });
        }

        // Store the latest administrator record
        const admin = result.rows[0];

        // Prevent suspended or disabled administrators from using protected APIs
        if (admin.status !== "active" || !admin.is_active) {
            return res.status(403).json({
                success: false,
                code: "ADMIN_SUSPENDED",
                message: "Administrator account is suspended"
            });
        }

        // Handle the platform-level Superadmin
        if (admin.role === "superadmin") {

            // Superadmin must not belong to a company
            if (admin.company_id !== null) {
                return res.status(500).json({
                    success: false,
                    message: "Invalid Superadmin configuration"
                });
            }

            // Attach trusted platform-level administrator context
            req.admin = {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                companyId: null,
                company: null
            };

            // Continue to the requested controller
            return next();
        }

        // Stop if an unsupported role exists
        if (admin.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Administrator role is not supported"
            });
        }

        // Every normal administrator must belong to a company
        if (!admin.company_id) {
            return res.status(403).json({
                success: false,
                code: "COMPANY_REQUIRED",
                message: "Administrator is not assigned to a company"
            });
        }

        // Fetch the administrator's current company
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
                settings,
                status,
                created_at,
                updated_at
            FROM companies
            WHERE id = $1
            LIMIT 1
            `,
            [admin.company_id]
        );

        // Stop if the company no longer exists
        if (companyResult.rows.length === 0) {
            return res.status(403).json({
                success: false,
                code: "COMPANY_NOT_FOUND",
                message: "Assigned company does not exist"
            });
        }

        // Store the current company
        const company = companyResult.rows[0];

        // Immediately block users belonging to suspended/inactive companies
        if (company.status !== "active") {
            return res.status(403).json({
                success: false,
                code: "COMPANY_SUSPENDED",
                message: "Company access has been suspended"
            });
        }

        // Attach trusted tenant context to the request
        // Controllers must use this companyId for company-owned data
        req.admin = {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            companyId: company.id,
            company: {
                id: company.id,
                name: company.name,
                slug: company.slug,
                logo_url: company.logo_url,
                email: company.email,
                phone: company.phone,
                address: company.address,
                settings: company.settings,
                status: company.status
            }
        };

        // Continue to the requested controller
        next();

    } catch (error) {
        // Log unexpected authentication errors
        console.error("Admin authentication error:", error.message);

        res.status(500).json({
            success: false,
            message: "Authentication failed"
        });
    }
};


// Export authentication middleware
export default adminAuth;