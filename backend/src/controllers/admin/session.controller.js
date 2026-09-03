// Import PostgreSQL connection pool
import { pool } from "../../database/database.js";


// Resolve the company that the current request is allowed to manage
const getRequestCompanyId = (req) => {

    // Superadmin manages an explicitly selected company
    if (
        req.admin.role === "superadmin" &&
        req.platformCompany
    ) {
        return req.platformCompany.id;
    }

    // Normal admin always manages their authenticated company
    return req.admin.companyId;
};


// Get all internet sessions for the current company
const getSessions = async (req, res) => {
    try {
        // Get trusted company ID
        const companyId = getRequestCompanyId(req);

        // Stop if company context is missing
        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: "Company context is required"
            });
        }

        // Get only sessions belonging to the selected company
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
                pay.payment_method,
                pay.phone_number,
                pay.transaction_reference

            FROM internet_sessions s

            JOIN packages p
                ON p.id = s.package_id
                AND p.company_id = s.company_id

            JOIN payments pay
                ON pay.id = s.payment_id
                AND pay.company_id = s.company_id

            WHERE s.company_id = $1

            ORDER BY s.created_at DESC
            `,
            [companyId]
        );

        // Return company-specific sessions
        res.status(200).json({
            success: true,
            sessions: result.rows
        });

    } catch (error) {
        // Log actual backend error
        console.error("Get sessions error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch internet sessions"
        });
    }
};


// Get one internet session
const getSessionById = async (req, res) => {
    try {
        // Get trusted company ID
        const companyId = getRequestCompanyId(req);

        // Get session ID from URL
        const sessionId = Number(req.params.id);

        // Validate session ID
        if (!Number.isInteger(sessionId) || sessionId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid session ID"
            });
        }

        // Fetch the session only when it belongs to the current company
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
                pay.payment_method,
                pay.phone_number,
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
                companyId
            ]
        );

        // Hide sessions that belong to another company
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Internet session not found"
            });
        }

        // Return session
        res.status(200).json({
            success: true,
            session: result.rows[0]
        });

    } catch (error) {
        // Log actual backend error
        console.error("Get session error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch internet session"
        });
    }
};


// Update the status of one internet session
const updateSessionStatus = async (req, res) => {
    try {
        // Get trusted company ID
        const companyId = getRequestCompanyId(req);

        // Get session ID
        const sessionId = Number(req.params.id);

        // Get requested status
        const { status } = req.body;

        // Validate session ID
        if (!Number.isInteger(sessionId) || sessionId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid session ID"
            });
        }

        // Define statuses supported by the current project
        const allowedStatuses = [
            "active",
            "suspended",
            "expired",
            "failed",
            "pending_activation"
        ];

        // Reject unsupported status
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid session status"
            });
        }

        // Update only a session owned by this company
        const result = await pool.query(
            `
            UPDATE internet_sessions
            SET status = $1
            WHERE id = $2
            AND company_id = $3
            RETURNING
                id,
                company_id,
                payment_id,
                package_id,
                started_at,
                expires_at,
                status,
                created_at
            `,
            [
                status,
                sessionId,
                companyId
            ]
        );

        // Return 404 if session belongs to another company
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Internet session not found"
            });
        }

        // Return updated session
        res.status(200).json({
            success: true,
            message: "Internet session status updated successfully",
            session: result.rows[0]
        });

    } catch (error) {
        // Log actual backend error
        console.error("Update session status error:", error.message);

        res.status(500).json({
            success: false,
            message: "Failed to update internet session"
        });
    }
};


// Export session controllers
export {
    getSessions,
    getSessionById,
    updateSessionStatus
};