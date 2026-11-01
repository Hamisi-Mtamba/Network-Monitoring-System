import { fulfillPayment } from '../../../services/payment-fulfillment.service.js';
// Import PostgreSQL connection pool
import {
    pool
} from "../../database/database.js";





// =========================================================
// COMPANY CONTEXT
// =========================================================

const getRequestCompanyId = (req) => {

    // Superadmin uses explicitly selected company
    if (
        req.admin.role === "superadmin" &&
        req.platformCompany
    ) {
        return req.platformCompany.id;
    }

    // Normal admin always uses authenticated company
    return req.admin.companyId;
};


// =========================================================
// GET ALL COMPANY PAYMENTS
// =========================================================

const getPayments = async (
    req,
    res
) => {

    try {

        const companyId =
            getRequestCompanyId(req);


        const result =
            await pool.query(
                `
                SELECT
                    pay.id,
                    pay.company_id,
                    pay.package_id,
                    pay.phone_number,
                    pay.payment_method,

                    COALESCE(
                        pay.amount,
                        p.price
                    ) AS amount,

                    pay.transaction_reference,
                    pay.status,

                    pay.router_id,
                    pay.device_mac,
                    pay.device_ip,
                    pay.mikrotik_login_url,

                    pay.created_at,
                    pay.paid_at,

                    p.name AS package_name,
                    p.price AS package_price,
                    p.duration_minutes

                FROM payments pay

                JOIN packages p
                    ON p.id = pay.package_id
                   AND p.company_id = pay.company_id

                WHERE pay.company_id = $1

                ORDER BY pay.created_at DESC
                `,
                [
                    companyId
                ]
            );


        return res.status(200).json({
            success: true,
            payments: result.rows
        });

    } catch (error) {

        console.error(
            "Get payments error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message: "Failed to fetch payments"
        });
    }
};


// =========================================================
// GET ONE PAYMENT
// =========================================================

const getPaymentById = async (
    req,
    res
) => {

    try {

        const companyId =
            getRequestCompanyId(req);


        const paymentId =
            Number(
                req.params.id
            );


        if (
            !Number.isInteger(paymentId) ||
            paymentId <= 0
        ) {

            return res.status(400).json({
                success: false,
                message: "Invalid payment ID"
            });
        }


        const paymentResult =
            await pool.query(
                `
                SELECT
                    pay.id,
                    pay.company_id,
                    pay.package_id,
                    pay.phone_number,
                    pay.payment_method,

                    COALESCE(
                        pay.amount,
                        p.price
                    ) AS amount,

                    pay.transaction_reference,
                    pay.status,

                    pay.router_id,
                    pay.device_mac,
                    pay.device_ip,
                    pay.mikrotik_login_url,

                    pay.created_at,
                    pay.paid_at,

                    p.name AS package_name,
                    p.price AS package_price,
                    p.duration_minutes

                FROM payments pay

                JOIN packages p
                    ON p.id = pay.package_id
                   AND p.company_id = pay.company_id

                WHERE pay.id = $1
                  AND pay.company_id = $2

                LIMIT 1
                `,
                [
                    paymentId,
                    companyId
                ]
            );


        if (
            paymentResult.rows.length === 0
        ) {

            return res.status(404).json({
                success: false,
                message: "Payment not found"
            });
        }


        const sessionResult =
            await pool.query(
                `
                SELECT
                    id,
                    company_id,
                    payment_id,
                    package_id,

                    router_id,
                    device_mac,
                    device_ip,
                    mikrotik_login_url,

                    started_at,
                    expires_at,
                    status,
                    created_at

                FROM internet_sessions

                WHERE payment_id = $1
                  AND company_id = $2

                ORDER BY id DESC

                LIMIT 1
                `,
                [
                    paymentId,
                    companyId
                ]
            );


        return res.status(200).json({

            success: true,

            payment:
                paymentResult.rows[0],

            session:
                sessionResult.rows.length > 0
                    ? sessionResult.rows[0]
                    : null
        });

    } catch (error) {

        console.error(
            "Get payment error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message: "Failed to fetch payment"
        });
    }
};


// =========================================================
// GET PENDING CASH REQUESTS
// =========================================================

const getCashRequests = async (
    req,
    res
) => {

    try {

        const companyId =
            getRequestCompanyId(req);


        const result =
            await pool.query(
                `
                SELECT
                    pay.id,
                    pay.company_id,
                    pay.package_id,
                    pay.phone_number,
                    pay.payment_method,

                    COALESCE(
                        pay.amount,
                        p.price
                    ) AS amount,

                    pay.transaction_reference,
                    pay.status,

                    pay.router_id,
                    pay.device_mac,
                    pay.device_ip,
                    pay.mikrotik_login_url,

                    pay.created_at,
                    pay.paid_at,

                    p.name AS package_name,
                    p.price AS package_price,
                    p.duration_minutes

                FROM payments pay

                JOIN packages p
                    ON p.id = pay.package_id
                   AND p.company_id = pay.company_id

                WHERE pay.company_id = $1
                  AND pay.payment_method = 'cash'
                  AND pay.status =
                      'awaiting_cash_confirmation'

                ORDER BY pay.created_at ASC
                `,
                [
                    companyId
                ]
            );


        return res.status(200).json({
            success: true,
            cash_requests: result.rows
        });

    } catch (error) {

        console.error(
            "Get cash requests error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch cash payment requests"
        });
    }
};


// =========================================================
// PROVISION PAYMENT SESSION ON MIKROTIK
// =========================================================

// Cash settlement is durable before the separate router job runs.
const confirmCashPayment = async (req,res) => {
    try {
        const companyId = getRequestCompanyId(req);
        if (!companyId) return res.status(403).json({success:false});
        const result = await fulfillPayment({companyId, reference:req.params.reference,
            source:'cash',adminId:req.admin.id});
        return res.json({success:true,message: result.session.status === 'active'
            ? 'Cash payment confirmed; internet access is active'
            : 'Cash payment confirmed; internet access is being activated',...result});
    } catch (error) {
        return res.status(error.status || 500).json({success:false,message:error.status ? error.message : 'Cash confirmation failed'});
    }
};
// Legacy simulation routes cannot bypass provider verification, even in development.
const markPaymentSuccessful = (req,res) => res.status(410).json({success:false,
    message:'Payment simulation was removed; online payments require Selcom verification'});

// =========================================================
// EXPORTS
// =========================================================

export {
    getPayments,
    getPaymentById,
    getCashRequests,
    confirmCashPayment,
    markPaymentSuccessful
};