import { changeSessionStatus } from '../../../services/session-lifecycle.service.js';
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
const updateSessionStatus = async (req,res) => {
    try {
        const id=Number(req.params.id);
        if (!Number.isSafeInteger(id) || id<=0) return res.status(400).json({success:false,message:'Invalid session ID'});
        const session=await changeSessionStatus(getRequestCompanyId(req),id,req.body?.status);
        return res.json({success:true,session,message:session.router_change_pending
            ? 'Session change saved; router update is pending' : 'Session and router updated'});
    } catch(error) {return res.status(error.status || 500).json({success:false,message:error.status ? error.message : 'Unable to change session'});}
};

// Export session controllers
export {
    getSessions,
    getSessionById,
    updateSessionStatus
};