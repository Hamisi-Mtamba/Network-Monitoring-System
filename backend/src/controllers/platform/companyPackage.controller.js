// Import PostgreSQL connection pool
import { pool } from "../../database/database.js";


// Get packages belonging to a company selected by Superadmin
const getCompanyPackages = async (req, res) => {
    try {
        // Get company ID selected by Superadmin
        const companyId = Number(req.params.companyId);

        // Validate company ID
        if (!Number.isInteger(companyId) || companyId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid company ID"
            });
        }

        // Verify that the selected company exists
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

        // Fetch only this company's packages
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

        // Return company and packages
        res.status(200).json({
            success: true,
            company: companyResult.rows[0],
            packages: result.rows
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Get company packages error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch company packages"
        });
    }
};


// Create a package inside a company selected by Superadmin
const createCompanyPackage = async (req, res) => {
    try {
        // Get company ID selected by Superadmin
        const companyId = Number(req.params.companyId);

        // Get package information
        const {
            name,
            price,
            duration_minutes,
            speed
        } = req.body;

        // Validate company ID
        if (!Number.isInteger(companyId) || companyId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid company ID"
            });
        }

        // Validate required package information
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

        // Verify the target company exists
        const companyResult = await pool.query(
            `
            SELECT id
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

        // Convert numeric values
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

        // Create package under the explicitly selected company
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
            RETURNING *
            `,
            [
                companyId,
                name.trim(),
                numericPrice,
                numericDuration,
                speed.trim()
            ]
        );

        // Return created package
        res.status(201).json({
            success: true,
            message: "Package created successfully",
            package: result.rows[0]
        });

    } catch (error) {
        // Log the actual backend error
        console.error("Create company package error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to create company package"
        });
    }
};


// Update a package inside a company selected by Superadmin
const updateCompanyPackage = async (req, res) => {
    try {
        // Get company and package IDs
        const companyId = Number(req.params.companyId);
        const packageId = Number(req.params.packageId);

        // Get editable package information
        const {
            name,
            price,
            duration_minutes,
            speed
        } = req.body;

        // Validate IDs
        if (!Number.isInteger(companyId) || companyId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid company ID"
            });
        }

        if (!Number.isInteger(packageId) || packageId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid package ID"
            });
        }

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

        // Update only when package belongs to selected company
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
            RETURNING *
            `,
            [
                name.trim(),
                Number(price),
                Number(duration_minutes),
                speed.trim(),
                packageId,
                companyId
            ]
        );

        // Stop if package is not part of selected company
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
        // Log backend error
        console.error("Update company package error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to update company package"
        });
    }
};


// Delete a package inside a company selected by Superadmin
const deleteCompanyPackage = async (req, res) => {
    try {
        // Get company and package IDs
        const companyId = Number(req.params.companyId);
        const packageId = Number(req.params.packageId);

        // Validate IDs
        if (
            !Number.isInteger(companyId) ||
            companyId <= 0 ||
            !Number.isInteger(packageId) ||
            packageId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid company or package ID"
            });
        }

        // Delete only when package belongs to selected company
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

        // Stop if package is not inside selected company
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
        // Protect historical references
        if (error.code === "23503") {
            return res.status(409).json({
                success: false,
                message: "Package cannot be deleted because it has related records"
            });
        }

        // Log unexpected error
        console.error("Delete company package error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to delete company package"
        });
    }
};

// Change package active status for a company selected by Superadmin
const updateCompanyPackageStatus = async (req, res) => {
    try {
        // Get company and package IDs
        const companyId = Number(req.params.companyId);
        const packageId = Number(req.params.packageId);

        // Get requested status
        const { is_active } = req.body;

        // Validate active status
        if (typeof is_active !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "is_active must be true or false"
            });
        }

        // Update only the selected company's package
        const result = await pool.query(
            `
            UPDATE packages
            SET is_active = $1
            WHERE id = $2
              AND company_id = $3
            RETURNING *
            `,
            [
                is_active,
                packageId,
                companyId
            ]
        );

        // Stop if package is not in selected company
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Package not found"
            });
        }

        // Return updated package
        res.status(200).json({
            success: true,
            message: "Package status updated successfully",
            package: result.rows[0]
        });

    } catch (error) {
        // Log actual backend error
        console.error("Update company package status error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to update package status"
        });
    }
};


// Change package schedule for a company selected by Superadmin
const updateCompanyPackageSchedule = async (req, res) => {
    try {
        // Get company and package IDs
        const companyId = Number(req.params.companyId);
        const packageId = Number(req.params.packageId);

        // Get availability schedule
        const {
            available_from,
            available_until
        } = req.body;

        // Validate schedule
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

        // Update only selected company's package
        const result = await pool.query(
            `
            UPDATE packages
            SET
                available_from = $1,
                available_until = $2
            WHERE id = $3
              AND company_id = $4
            RETURNING *
            `,
            [
                available_from || null,
                available_until || null,
                packageId,
                companyId
            ]
        );

        // Stop if package is outside selected company
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Package not found"
            });
        }

        // Return updated package
        res.status(200).json({
            success: true,
            message: "Package schedule updated successfully",
            package: result.rows[0]
        });

    } catch (error) {
        // Log actual backend error
        console.error("Update company package schedule error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to update package schedule"
        });
    }
};


// Export platform package controllers
export {
    getCompanyPackages,
    createCompanyPackage,
    updateCompanyPackage,
    updateCompanyPackageStatus,
    updateCompanyPackageSchedule,
    deleteCompanyPackage
};