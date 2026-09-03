// Import bcrypt to hash company administrator passwords
import bcrypt from "bcrypt";

// Import PostgreSQL connection pool
import { pool } from "../../database/database.js";


// Get all administrators belonging to one company
const getCompanyAdmins = async (req, res) => {
    try {
        // Get the company ID selected by the Superadmin
        const companyId = Number(req.params.companyId);

        // Validate company ID
        if (!Number.isInteger(companyId) || companyId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid company ID"
            });
        }

        // Make sure the company exists
        const companyResult = await pool.query(
            `
            SELECT id, name, status
            FROM companies
            WHERE id = $1
            LIMIT 1
            `,
            [companyId]
        );

        // Stop if the company does not exist
        if (companyResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }

        // Fetch only normal admins belonging to this company
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
            WHERE company_id = $1
              AND role = 'admin'
            ORDER BY id ASC
            `,
            [companyId]
        );

        // Return company and administrators
        res.status(200).json({
            success: true,
            company: companyResult.rows[0],
            admins: result.rows
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Get company admins error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch company administrators"
        });
    }
};


// Create a normal administrator for a company
const createCompanyAdmin = async (req, res) => {
    try {
        // Get the company ID selected by the Superadmin
        const companyId = Number(req.params.companyId);

        // Get administrator details from the request body
        const {
            name,
            email,
            password
        } = req.body;

        // Validate company ID
        if (!Number.isInteger(companyId) || companyId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid company ID"
            });
        }

        // Validate required administrator fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required"
            });
        }

        // Clean values
        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        // Validate name length
        if (cleanName.length < 2 || cleanName.length > 200) {
            return res.status(400).json({
                success: false,
                message: "Administrator name must be between 2 and 200 characters"
            });
        }

        // Basic email validation
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        // Stop if the email format is invalid
        if (!emailPattern.test(cleanEmail)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid email address"
            });
        }

        // Require a reasonable password length
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters"
            });
        }

        // Make sure the target company exists
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

        // Stop if the target company does not exist
        if (companyResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }

        // Check whether another account already uses the submitted email
        const existingAdmin = await pool.query(
            `
            SELECT id
            FROM admins
            WHERE LOWER(email) = LOWER($1)
            LIMIT 1
            `,
            [cleanEmail]
        );

        // Stop if the email is already used
        if (existingAdmin.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "An administrator with this email already exists"
            });
        }

        // Hash the submitted password before storing it
        const hashedPassword = await bcrypt.hash(
            password,
            10
        );

        // Create a normal administrator for the selected company
        // Role is hardcoded as admin
        // The frontend cannot create another Superadmin
        const result = await pool.query(
            `
            INSERT INTO admins (
                company_id,
                name,
                email,
                password,
                role,
                status,
                is_active,
                created_at
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                'admin',
                'active',
                TRUE,
                CURRENT_TIMESTAMP
            )
            RETURNING
                id,
                company_id,
                name,
                email,
                role,
                status,
                is_active,
                created_at
            `,
            [
                companyId,
                cleanName,
                cleanEmail,
                hashedPassword
            ]
        );

        // Return the created company administrator
        res.status(201).json({
            success: true,
            message: "Company administrator created successfully",
            admin: result.rows[0]
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Create company admin error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to create company administrator"
        });
    }
};


// Update a company administrator
const updateCompanyAdmin = async (req, res) => {
    try {
        // Get company and admin IDs from the URL
        const companyId = Number(req.params.companyId);
        const adminId = Number(req.params.adminId);

        // Get editable administrator information
        const {
            name,
            email
        } = req.body;

        // Validate company ID
        if (!Number.isInteger(companyId) || companyId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid company ID"
            });
        }

        // Validate administrator ID
        if (!Number.isInteger(adminId) || adminId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid administrator ID"
            });
        }

        // Prevent Superadmin account modification
        if (adminId === 1) {
            return res.status(403).json({
                success: false,
                message: "Superadmin cannot be modified here"
            });
        }

        // Require at least one editable value
        if (name === undefined && email === undefined) {
            return res.status(400).json({
                success: false,
                message: "No administrator information provided"
            });
        }

        // Clean submitted email when provided
        let cleanEmail = null;

        if (email !== undefined) {
            cleanEmail = email.trim().toLowerCase();

            // Basic email validation
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            // Stop if email format is invalid
            if (!emailPattern.test(cleanEmail)) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide a valid email address"
                });
            }

            // Make sure another administrator does not use the same email
            const existingEmail = await pool.query(
                `
                SELECT id
                FROM admins
                WHERE LOWER(email) = LOWER($1)
                  AND id <> $2
                LIMIT 1
                `,
                [
                    cleanEmail,
                    adminId
                ]
            );

            // Stop when email already belongs to another account
            if (existingEmail.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: "Administrator email already exists"
                });
            }
        }

        // Update only an admin belonging to the selected company
        const result = await pool.query(
            `
            UPDATE admins
            SET
                name = COALESCE($1, name),
                email = COALESCE($2, email)
            WHERE id = $3
              AND company_id = $4
              AND role = 'admin'
            RETURNING
                id,
                company_id,
                name,
                email,
                role,
                status,
                is_active,
                created_at
            `,
            [
                name?.trim() || null,
                cleanEmail,
                adminId,
                companyId
            ]
        );

        // Stop if the administrator does not belong to the company
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Company administrator not found"
            });
        }

        // Return the updated administrator
        res.status(200).json({
            success: true,
            message: "Company administrator updated successfully",
            admin: result.rows[0]
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Update company admin error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to update company administrator"
        });
    }
};


// Change a company administrator password
const changeCompanyAdminPassword = async (req, res) => {
    try {
        // Get company and admin IDs from the URL
        const companyId = Number(req.params.companyId);
        const adminId = Number(req.params.adminId);

        // Get the new password
        const { password } = req.body;

        // Validate IDs
        if (!Number.isInteger(companyId) || companyId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid company ID"
            });
        }

        if (!Number.isInteger(adminId) || adminId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid administrator ID"
            });
        }

        // Prevent the platform Superadmin password from being changed here
        if (adminId === 1) {
            return res.status(403).json({
                success: false,
                message: "Superadmin password cannot be changed here"
            });
        }

        // Validate password
        if (!password || password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters"
            });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(
            password,
            10
        );

        // Update only an admin belonging to this company
        const result = await pool.query(
            `
            UPDATE admins
            SET password = $1
            WHERE id = $2
              AND company_id = $3
              AND role = 'admin'
            RETURNING
                id,
                company_id,
                name,
                email
            `,
            [
                hashedPassword,
                adminId,
                companyId
            ]
        );

        // Stop if administrator does not belong to company
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Company administrator not found"
            });
        }

        // Return confirmation
        res.status(200).json({
            success: true,
            message: "Administrator password changed successfully",
            admin: result.rows[0]
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Change company admin password error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to change administrator password"
        });
    }
};


// Suspend a company administrator
const suspendCompanyAdmin = async (req, res) => {
    try {
        // Get company and administrator IDs
        const companyId = Number(req.params.companyId);
        const adminId = Number(req.params.adminId);

        // Validate IDs
        if (!Number.isInteger(companyId) || companyId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid company ID"
            });
        }

        if (!Number.isInteger(adminId) || adminId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid administrator ID"
            });
        }

        // Protect the platform Superadmin
        if (adminId === 1) {
            return res.status(403).json({
                success: false,
                message: "Superadmin cannot be suspended"
            });
        }

        // Suspend only an administrator belonging to this company
        const result = await pool.query(
            `
            UPDATE admins
            SET
                status = 'suspended',
                is_active = FALSE
            WHERE id = $1
              AND company_id = $2
              AND role = 'admin'
            RETURNING
                id,
                company_id,
                name,
                email,
                role,
                status,
                is_active
            `,
            [
                adminId,
                companyId
            ]
        );

        // Stop if administrator is not found inside the company
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Company administrator not found"
            });
        }

        // Return the suspended administrator
        res.status(200).json({
            success: true,
            message: "Administrator suspended successfully",
            admin: result.rows[0]
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Suspend company admin error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to suspend administrator"
        });
    }
};


// Reactivate a company administrator
const activateCompanyAdmin = async (req, res) => {
    try {
        // Get company and administrator IDs
        const companyId = Number(req.params.companyId);
        const adminId = Number(req.params.adminId);

        // Validate IDs
        if (!Number.isInteger(companyId) || companyId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid company ID"
            });
        }

        if (!Number.isInteger(adminId) || adminId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid administrator ID"
            });
        }

        // Reactivate only an administrator belonging to the selected company
        const result = await pool.query(
            `
            UPDATE admins
            SET
                status = 'active',
                is_active = TRUE
            WHERE id = $1
              AND company_id = $2
              AND role = 'admin'
            RETURNING
                id,
                company_id,
                name,
                email,
                role,
                status,
                is_active
            `,
            [
                adminId,
                companyId
            ]
        );

        // Stop if administrator does not belong to the company
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Company administrator not found"
            });
        }

        // Return the activated administrator
        res.status(200).json({
            success: true,
            message: "Administrator activated successfully",
            admin: result.rows[0]
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Activate company admin error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to activate administrator"
        });
    }
};


// Delete a company administrator
const deleteCompanyAdmin = async (req, res) => {
    try {
        // Get company and administrator IDs
        const companyId = Number(req.params.companyId);
        const adminId = Number(req.params.adminId);

        // Validate IDs
        if (!Number.isInteger(companyId) || companyId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid company ID"
            });
        }

        if (!Number.isInteger(adminId) || adminId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid administrator ID"
            });
        }

        // Protect the platform Superadmin
        if (adminId === 1) {
            return res.status(403).json({
                success: false,
                message: "Superadmin cannot be deleted"
            });
        }

        // Delete only an admin belonging to the selected company
        const result = await pool.query(
            `
            DELETE FROM admins
            WHERE id = $1
              AND company_id = $2
              AND role = 'admin'
            RETURNING
                id,
                company_id,
                name,
                email
            `,
            [
                adminId,
                companyId
            ]
        );

        // Stop if administrator is not inside this company
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Company administrator not found"
            });
        }

        // Return confirmation
        res.status(200).json({
            success: true,
            message: "Administrator deleted successfully",
            admin: result.rows[0]
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Delete company admin error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to delete administrator"
        });
    }
};


// Export company administrator controllers
export {
    getCompanyAdmins,
    createCompanyAdmin,
    updateCompanyAdmin,
    changeCompanyAdminPassword,
    suspendCompanyAdmin,
    activateCompanyAdmin,
    deleteCompanyAdmin
};