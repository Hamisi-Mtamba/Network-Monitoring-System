// Import PostgreSQL connection pool
import { pool } from "../../database/database.js";


// Get all packages belonging to the authenticated company
const getPackages = async (req, res) => {
    try {
        // Get the trusted company ID from authentication middleware
        const companyId = req.admin.companyId;

        // Stop if company context is missing
        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: "Company context is required"
            });
        }

        // Fetch packages belonging only to this company
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
            ORDER BY price ASC, id ASC
            `,
            [companyId]
        );

        // Return company-specific packages
        res.status(200).json({
            success: true,
            packages: result.rows
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Get packages error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch packages"
        });
    }
};


// Get one package belonging to the authenticated company
const getPackageById = async (req, res) => {
    try {
        // Get the trusted company ID
        const companyId = req.admin.companyId;

        // Get package ID from the URL
        const packageId = Number(req.params.id);

        // Validate package ID
        if (!Number.isInteger(packageId) || packageId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid package ID"
            });
        }

        // Fetch the package only when it belongs to this company
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
            WHERE id = $1
              AND company_id = $2
            LIMIT 1
            `,
            [
                packageId,
                companyId
            ]
        );

        // Return 404 when package does not belong to this company
        // This avoids leaking information about another tenant
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Package not found"
            });
        }

        // Return the package
        res.status(200).json({
            success: true,
            package: result.rows[0]
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Get package error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch package"
        });
    }
};


// Create a package for the authenticated company
const createPackage = async (req, res) => {
    try {
        // Get the trusted company ID from the authenticated admin
        const companyId = req.admin.companyId;

        // Get package information from the request body
        const {
            name,
            price,
            duration_minutes,
            speed
        } = req.body;

        // Validate required fields
        if (
            !name ||
            price === undefined ||
            duration_minutes === undefined ||
            !speed
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, price, duration and speed are required"
            });
        }

        // Convert numeric values
        const numericPrice = Number(price);
        const numericDuration = Number(duration_minutes);

        // Validate package name
        const cleanName = name.trim();

        if (cleanName.length < 2 || cleanName.length > 200) {
            return res.status(400).json({
                success: false,
                message: "Package name must be between 2 and 200 characters"
            });
        }

        // Validate price
        if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
            return res.status(400).json({
                success: false,
                message: "Package price must be greater than zero"
            });
        }

        // Validate package duration
        if (!Number.isInteger(numericDuration) || numericDuration <= 0) {
            return res.status(400).json({
                success: false,
                message: "Package duration must be a positive number of minutes"
            });
        }

        // Create the package
        // company_id comes from authentication, never from the frontend
        const result = await pool.query(
            `
            INSERT INTO packages (
                company_id,
                name,
                price,
                duration_minutes,
                speed,
                is_active
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                TRUE
            )
            RETURNING
                id,
                company_id,
                name,
                price,
                duration_minutes,
                speed,
                is_active,
                available_from,
                available_until
            `,
            [
                companyId,
                cleanName,
                numericPrice,
                numericDuration,
                speed.trim()
            ]
        );

        // Return the created package
        res.status(201).json({
            success: true,
            message: "Package created successfully",
            package: result.rows[0]
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Create package error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to create package"
        });
    }
};


// Update a package belonging to the authenticated company
const updatePackage = async (req, res) => {
    try {
        // Get trusted company ID
        const companyId = req.admin.companyId;

        // Get package ID
        const packageId = Number(req.params.id);

        // Get editable package fields
        const {
            name,
            price,
            duration_minutes,
            speed
        } = req.body;

        // Validate package ID
        if (!Number.isInteger(packageId) || packageId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid package ID"
            });
        }

        // Require all package fields for this update
        if (
            !name ||
            price === undefined ||
            duration_minutes === undefined ||
            !speed
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, price, duration and speed are required"
            });
        }

        // Convert submitted numeric values
        const numericPrice = Number(price);
        const numericDuration = Number(duration_minutes);

        // Validate price
        if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
            return res.status(400).json({
                success: false,
                message: "Package price must be greater than zero"
            });
        }

        // Validate duration
        if (!Number.isInteger(numericDuration) || numericDuration <= 0) {
            return res.status(400).json({
                success: false,
                message: "Package duration must be a positive number of minutes"
            });
        }

        // Update only when the package belongs to the authenticated company
        const result = await pool.query(
            `
            UPDATE packages
            SET
                name = $1,
                price = $2,
                duration_minutes = $3,
                speed = $4
            WHERE id = $5
              AND company_id = $6
            RETURNING
                id,
                company_id,
                name,
                price,
                duration_minutes,
                speed,
                is_active,
                available_from,
                available_until
            `,
            [
                name.trim(),
                numericPrice,
                numericDuration,
                speed.trim(),
                packageId,
                companyId
            ]
        );

        // Package may exist in another company
        // but this tenant must still receive 404
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Package not found"
            });
        }

        // Return updated package
        res.status(200).json({
            success: true,
            message: "Package updated successfully",
            package: result.rows[0]
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Update package error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to update package"
        });
    }
};


// Change package active status
const updatePackageStatus = async (req, res) => {
    try {
        // Get trusted company ID
        const companyId = req.admin.companyId;

        // Get package ID
        const packageId = Number(req.params.id);

        // Get requested active status
        const { is_active } = req.body;

        // Validate package ID
        if (!Number.isInteger(packageId) || packageId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid package ID"
            });
        }

        // Validate active status
        if (typeof is_active !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "is_active must be true or false"
            });
        }

        // Update only a package belonging to this company
        const result = await pool.query(
            `
            UPDATE packages
            SET is_active = $1
            WHERE id = $2
              AND company_id = $3
            RETURNING
                id,
                company_id,
                name,
                is_active
            `,
            [
                is_active,
                packageId,
                companyId
            ]
        );

        // Stop when package does not belong to this company
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Package not found"
            });
        }

        // Return updated package status
        res.status(200).json({
            success: true,
            message: "Package status updated successfully",
            package: result.rows[0]
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Update package status error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to update package status"
        });
    }
};


// Update package availability schedule
const updatePackageSchedule = async (req, res) => {
    try {
        // Get trusted company ID
        const companyId = req.admin.companyId;

        // Get package ID
        const packageId = Number(req.params.id);

        // Get schedule values
        const {
            available_from,
            available_until
        } = req.body;

        // Validate package ID
        if (!Number.isInteger(packageId) || packageId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid package ID"
            });
        }

        // Validate schedule order when both values exist
        if (
            available_from &&
            available_until &&
            new Date(available_until) <= new Date(available_from)
        ) {
            return res.status(400).json({
                success: false,
                message: "Availability end must be after availability start"
            });
        }

        // Update only the authenticated company's package
        const result = await pool.query(
            `
            UPDATE packages
            SET
                available_from = $1,
                available_until = $2
            WHERE id = $3
              AND company_id = $4
            RETURNING
                id,
                company_id,
                name,
                available_from,
                available_until
            `,
            [
                available_from || null,
                available_until || null,
                packageId,
                companyId
            ]
        );

        // Stop if package is not owned by this company
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Package not found"
            });
        }

        // Return updated schedule
        res.status(200).json({
            success: true,
            message: "Package schedule updated successfully",
            package: result.rows[0]
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Update package schedule error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to update package schedule"
        });
    }
};


// Delete a package belonging to the authenticated company
const deletePackage = async (req, res) => {
    try {
        // Get trusted company ID
        const companyId = req.admin.companyId;

        // Get package ID
        const packageId = Number(req.params.id);

        // Validate package ID
        if (!Number.isInteger(packageId) || packageId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid package ID"
            });
        }

        // Delete only when package belongs to this company
        const result = await pool.query(
            `
            DELETE FROM packages
            WHERE id = $1
              AND company_id = $2
            RETURNING
                id,
                company_id,
                name
            `,
            [
                packageId,
                companyId
            ]
        );

        // Stop when package does not belong to this company
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Package not found"
            });
        }

        // Return confirmation
        res.status(200).json({
            success: true,
            message: "Package deleted successfully",
            package: result.rows[0]
        });

    } catch (error) {
        // Foreign-key restrictions may prevent deleting packages
        // that already have payment/session history
        if (error.code === "23503") {
            return res.status(409).json({
                success: false,
                message: "Package cannot be deleted because it has related records"
            });
        }

        // Log unexpected backend errors
        console.error("Delete package error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to delete package"
        });
    }
};


// Export package controllers
export {
    getPackages,
    getPackageById,
    createPackage,
    updatePackage,
    updatePackageStatus,
    updatePackageSchedule,
    deletePackage
};