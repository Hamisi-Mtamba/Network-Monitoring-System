// Import bcrypt to compare the submitted password with the hashed password
import bcrypt from "bcrypt";

// Import jsonwebtoken to create the admin authentication token
import jwt from "jsonwebtoken";

// Import PostgreSQL connection pool
import { pool } from "../../database/database.js";


// Admin and Superadmin login controller
const loginAdmin = async (req, res) => {
    try {
        // Get login credentials sent from Postman/admin app
        const { email, password } = req.body;

        // Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        // Clean the submitted email
        const cleanEmail = email.trim().toLowerCase();

        // Find the administrator account by email
        const result = await pool.query(
            `
            SELECT
                id,
                company_id,
                name,
                email,
                password,
                role,
                status,
                is_active,
                created_at
            FROM admins
            WHERE LOWER(email) = LOWER($1)
            LIMIT 1
            `,
            [cleanEmail]
        );

        // Stop if the account does not exist
        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Store the administrator account
        const admin = result.rows[0];

        // Compare the submitted password with the bcrypt hash
        const passwordMatches = await bcrypt.compare(
            password,
            admin.password
        );

        // Stop if the password is incorrect
        if (!passwordMatches) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Prevent suspended or disabled administrator accounts from logging in
        if (admin.status !== "active" || !admin.is_active) {
            return res.status(403).json({
                success: false,
                code: "ADMIN_SUSPENDED",
                message: "Administrator account is suspended"
            });
        }

        // Company administrators must belong to a company
        if (admin.role === "admin" && !admin.company_id) {
            return res.status(403).json({
                success: false,
                code: "COMPANY_REQUIRED",
                message: "Administrator is not assigned to a company"
            });
        }

        // Superadmin must never belong to a company
        if (admin.role === "superadmin" && admin.company_id !== null) {
            return res.status(500).json({
                success: false,
                message: "Invalid Superadmin configuration"
            });
        }

        let company = null;

        // Normal company administrators must have an active company
        if (admin.role === "admin") {

            // Fetch the administrator's company directly from PostgreSQL
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

            // Stop if the assigned company no longer exists
            if (companyResult.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    code: "COMPANY_NOT_FOUND",
                    message: "Assigned company does not exist"
                });
            }

            // Store company information
            company = companyResult.rows[0];

            // Prevent administrators from accessing suspended companies
            if (company.status !== "active") {
                return res.status(403).json({
                    success: false,
                    code: "COMPANY_SUSPENDED",
                    message: "Company access has been suspended"
                });
            }
        }

        // Create the JWT authentication token
        const token = jwt.sign(
            {
                adminId: admin.id,
                role: admin.role,
                companyId: admin.company_id
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || "1d"
            }
        );

        // Return the token and safe administrator information
        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                company_id: admin.company_id,
                status: admin.status
            },
            company: company
                ? {
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
                : null
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Admin login error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to login"
        });
    }
};


// Return the currently authenticated administrator
const getCurrentAdmin = async (req, res) => {
    try {
        // adminAuth middleware already authenticated the request
        // and stored trusted database information inside req.admin
        const adminId = req.admin.id;

        // Fetch the latest administrator information
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
            [adminId]
        );

        // Stop if the administrator no longer exists
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Administrator account not found"
            });
        }

        // Store the latest administrator information
        const admin = result.rows[0];

        let company = null;

        // Load company information for normal company administrators
        if (admin.role === "admin") {

            // Fetch the administrator's company
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

            // Store the company when found
            if (companyResult.rows.length > 0) {
                company = companyResult.rows[0];
            }
        }

        // Return the current administrator
        res.status(200).json({
            success: true,

            admin: {
                id: admin.id,

                // Normal admins have a company ID
                // Superadmin has null
                company_id: admin.company_id,

                name: admin.name,
                email: admin.email,

                // Required by frontend role handling
                role: admin.role,

                status: admin.status,
                is_active: admin.is_active,

                created_at: admin.created_at
            }
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Get current admin error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch administrator profile"
        });
    }
};


// Export authentication controllers
export {
    loginAdmin,
    getCurrentAdmin
};