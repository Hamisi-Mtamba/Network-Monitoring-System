// Import bcrypt to hash passwords before saving them in PostgreSQL
import bcrypt from "bcrypt";

// Import PostgreSQL connection pool
import { pool } from "../../database/database.js";


// Get all normal admin accounts
const getAllAdmins = async (req, res) => {
    try {
        // Fetch normal admins only
        // Super Admin is intentionally excluded from this response
        const result = await pool.query(
            `
            SELECT
                id,
                name,
                email,
                role,
                status,
                is_active,
                created_at
            FROM admins
            WHERE role = 'admin'
            ORDER BY id ASC
            `
        );

        // Return all normal admin accounts
        res.status(200).json({
            success: true,
            admins: result.rows
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Get all admins error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch admins"
        });
    }
};


// Get one normal admin account
const getAdminById = async (req, res) => {
    try {
        // Get admin ID from the URL
        const { id } = req.params;

        // Validate the admin ID
        const adminId = Number(id);

        if (!Number.isInteger(adminId) || adminId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid admin ID"
            });
        }

        // Fetch the requested normal admin
        const result = await pool.query(
            `
            SELECT
                id,
                name,
                email,
                role,
                status,
                is_active,
                created_at
            FROM admins
            WHERE id = $1
              AND role = 'admin'
            LIMIT 1
            `,
            [adminId]
        );

        // Stop if the normal admin does not exist
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Admin account not found"
            });
        }

        // Return safe admin information
        res.status(200).json({
            success: true,
            admin: result.rows[0]
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Get admin by ID error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch admin"
        });
    }
};


// Create a new normal admin account
const createAdmin = async (req, res) => {
    try {
        // Get the new admin information from the request body
        const { name, email, password } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Name, email and password are required"
            });
        }

        // Clean the submitted values
        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        // Validate the admin name
        if (cleanName.length < 2 || cleanName.length > 200) {
            return res.status(400).json({
                success: false,
                message: "Admin name must be between 2 and 200 characters"
            });
        }

        // Basic email validation
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

        // Check whether another admin already uses this email
        const existingAdmin = await pool.query(
            `
            SELECT id
            FROM admins
            WHERE LOWER(email) = LOWER($1)
            LIMIT 1
            `,
            [cleanEmail]
        );

        // Stop if the email already belongs to another admin
        if (existingAdmin.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "An admin with this email already exists"
            });
        }

        // Hash the password before storing it
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a normal admin account
        // Super Admin cannot be created through this endpoint
        const result = await pool.query(
            `
            INSERT INTO admins (
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
                'admin',
                'active',
                TRUE,
                CURRENT_TIMESTAMP
            )
            RETURNING
                id,
                name,
                email,
                role,
                status,
                is_active,
                created_at
            `,
            [
                cleanName,
                cleanEmail,
                hashedPassword
            ]
        );

        // Return the newly created admin
        res.status(201).json({
            success: true,
            message: "Admin account created successfully",
            admin: result.rows[0]
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Create admin error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to create admin"
        });
    }
};


// Suspend a normal admin account
const suspendAdmin = async (req, res) => {
    try {
        // Get admin ID from the URL
        const { id } = req.params;

        // Convert the admin ID to a number
        const adminId = Number(id);

        // Validate the admin ID
        if (!Number.isInteger(adminId) || adminId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid admin ID"
            });
        }

        // Prevent ID 1 from ever being suspended through this endpoint
        if (adminId === 1) {
            return res.status(403).json({
                success: false,
                message: "Super Admin cannot be suspended"
            });
        }

        // Suspend normal admin only
        const result = await pool.query(
            `
            UPDATE admins
            SET
                status = 'suspended',
                is_active = FALSE
            WHERE id = $1
              AND role = 'admin'
            RETURNING
                id,
                name,
                email,
                role,
                status,
                is_active,
                created_at
            `,
            [adminId]
        );

        // Stop if the normal admin does not exist
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Admin account not found"
            });
        }

        // Return the suspended admin
        res.status(200).json({
            success: true,
            message: "Admin account suspended successfully",
            admin: result.rows[0]
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Suspend admin error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to suspend admin"
        });
    }
};


// Reactivate a suspended normal admin account
const activateAdmin = async (req, res) => {
    try {
        // Get admin ID from the URL
        const { id } = req.params;

        // Convert the admin ID to a number
        const adminId = Number(id);

        // Validate the admin ID
        if (!Number.isInteger(adminId) || adminId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid admin ID"
            });
        }

        // Reactivate normal admin only
        const result = await pool.query(
            `
            UPDATE admins
            SET
                status = 'active',
                is_active = TRUE
            WHERE id = $1
              AND role = 'admin'
            RETURNING
                id,
                name,
                email,
                role,
                status,
                is_active,
                created_at
            `,
            [adminId]
        );

        // Stop if the normal admin does not exist
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Admin account not found"
            });
        }

        // Return the reactivated admin
        res.status(200).json({
            success: true,
            message: "Admin account activated successfully",
            admin: result.rows[0]
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Activate admin error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to activate admin"
        });
    }
};


// Delete a normal admin account
const deleteAdmin = async (req, res) => {
    try {
        // Get admin ID from the URL
        const { id } = req.params;

        // Convert the admin ID to a number
        const adminId = Number(id);

        // Validate the admin ID
        if (!Number.isInteger(adminId) || adminId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid admin ID"
            });
        }

        // Prevent the Super Admin account from ever being deleted
        if (adminId === 1) {
            return res.status(403).json({
                success: false,
                message: "Super Admin cannot be deleted"
            });
        }

        // Delete normal admin only
        const result = await pool.query(
            `
            DELETE FROM admins
            WHERE id = $1
              AND role = 'admin'
            RETURNING
                id,
                name,
                email
            `,
            [adminId]
        );

        // Stop if the normal admin does not exist
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Admin account not found"
            });
        }

        // Return confirmation
        res.status(200).json({
            success: true,
            message: "Admin account deleted successfully",
            admin: result.rows[0]
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Delete admin error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to delete admin"
        });
    }
};


// Change a normal admin password
const changeAdminPassword = async (req, res) => {
    try {
        // Get admin ID from the URL
        const { id } = req.params;

        // Get the new password from the request body
        const { password } = req.body;

        // Convert the admin ID to a number
        const adminId = Number(id);

        // Validate the admin ID
        if (!Number.isInteger(adminId) || adminId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid admin ID"
            });
        }

        // Prevent changing the Super Admin password from Admin Management
        if (adminId === 1) {
            return res.status(403).json({
                success: false,
                message: "Super Admin password cannot be changed here"
            });
        }

        // Validate the new password
        if (!password || password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters"
            });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update the normal admin password
        const result = await pool.query(
            `
            UPDATE admins
            SET password = $1
            WHERE id = $2
              AND role = 'admin'
            RETURNING
                id,
                name,
                email
            `,
            [
                hashedPassword,
                adminId
            ]
        );

        // Stop if the admin does not exist
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Admin account not found"
            });
        }

        // Return confirmation
        res.status(200).json({
            success: true,
            message: "Admin password changed successfully",
            admin: result.rows[0]
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Change admin password error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to change admin password"
        });
    }
};


// Get the current global system status
const getSystemStatus = async (req, res) => {
    try {
        // Fetch the single global system settings record
        const result = await pool.query(
            `
            SELECT
                id,
                system_status,
                suspension_reason,
                suspended_at,
                updated_at
            FROM system_settings
            WHERE id = 1
            LIMIT 1
            `
        );

        // Stop if the system settings record does not exist
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "System settings not found"
            });
        }

        // Return the current system status
        res.status(200).json({
            success: true,
            system: result.rows[0]
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Get system status error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch system status"
        });
    }
};


// Suspend the whole system for normal admins
const suspendSystem = async (req, res) => {
    try {
        // Get the optional suspension reason from the request body
        const { reason } = req.body;

        // Use a default reason when none was provided
        const suspensionReason =
            reason?.trim() || "System suspended by Super Admin";

        // Change the global system status to suspended
        const result = await pool.query(
            `
            UPDATE system_settings
            SET
                system_status = 'suspended',
                suspension_reason = $1,
                suspended_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
            RETURNING
                id,
                system_status,
                suspension_reason,
                suspended_at,
                updated_at
            `,
            [suspensionReason]
        );

        // Stop if the global system settings record does not exist
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "System settings not found"
            });
        }

        // Return the new system status
        res.status(200).json({
            success: true,
            message: "System suspended successfully",
            system: result.rows[0]
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Suspend system error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to suspend system"
        });
    }
};


// Reactivate the whole system
const activateSystem = async (req, res) => {
    try {
        // Change the global system status back to active
        const result = await pool.query(
            `
            UPDATE system_settings
            SET
                system_status = 'active',
                suspension_reason = NULL,
                suspended_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = 1
            RETURNING
                id,
                system_status,
                suspension_reason,
                suspended_at,
                updated_at
            `
        );

        // Stop if the global system settings record does not exist
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "System settings not found"
            });
        }

        // Return the reactivated system status
        res.status(200).json({
            success: true,
            message: "System activated successfully",
            system: result.rows[0]
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Activate system error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to activate system"
        });
    }
};


// Export all Super Admin controller functions
export {
    getAllAdmins,
    getAdminById,
    createAdmin,
    suspendAdmin,
    activateAdmin,
    deleteAdmin,
    changeAdminPassword,
    getSystemStatus,
    suspendSystem,
    activateSystem
};