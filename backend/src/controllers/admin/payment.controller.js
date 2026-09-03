// Import PostgreSQL connection pool
import {
    pool
} from "../../database/database.js";


// Import MikroTik provisioning service
import {
    provisionHotspotAccess,
    removeExistingHotspotHost
} from "../../../services/mikrotik.service.js";


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

const provisionPaymentOnMikrotik = async (
    payment
) => {

    if (!payment.device_mac) {

        throw new Error(
            "Payment device MAC address is missing"
        );
    }


    const durationMinutes =
        Number(
            payment.duration_minutes
        );


    if (
        !Number.isInteger(durationMinutes) ||
        durationMinutes <= 0
    ) {

        throw new Error(
            "Package duration is invalid"
        );
    }


    await provisionHotspotAccess({

        macAddress:
            payment.device_mac,

        durationMinutes
    });
};


// =========================================================
// CONFIRM CASH PAYMENT
// =========================================================

const confirmCashPayment = async (
    req,
    res
) => {

    const client =
        await pool.connect();


    try {

        const companyId =
            getRequestCompanyId(req);


        const transactionReference =
            req.params.reference
                ?.trim();


        if (!transactionReference) {

            return res.status(400).json({
                success: false,
                message:
                    "Payment reference is required"
            });
        }


        await client.query(
            "BEGIN"
        );


        // =================================================
        // FIND AND LOCK CASH PAYMENT
        // =========================================================

        const paymentResult =
            await client.query(
                `
                SELECT
                    pay.id,
                    pay.company_id,
                    pay.package_id,
                    pay.phone_number,
                    pay.payment_method,
                    pay.amount,
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

                WHERE pay.transaction_reference = $1
                  AND pay.company_id = $2

                LIMIT 1

                FOR UPDATE OF pay
                `,
                [
                    transactionReference,
                    companyId
                ]
            );


        if (
            paymentResult.rows.length === 0
        ) {

            await client.query(
                "ROLLBACK"
            );


            return res.status(404).json({
                success: false,
                message:
                    "Cash payment request not found"
            });
        }


        const payment =
            paymentResult.rows[0];


        // =================================================
        // MAKE SURE THIS IS CASH
        // =========================================================

        if (
            payment.payment_method !==
            "cash"
        ) {

            await client.query(
                "ROLLBACK"
            );


            return res.status(400).json({
                success: false,
                message:
                    "Payment is not a cash payment"
            });
        }


        // =================================================
        // MAKE SURE IT IS STILL WAITING
        // =========================================================

        if (
            payment.status !==
            "awaiting_cash_confirmation"
        ) {

            await client.query(
                "ROLLBACK"
            );


            return res.status(409).json({
                success: false,
                message:
                    "Cash payment has already been processed"
            });
        }


        // =================================================
        // REQUIRE MIKROTIK CONTEXT
        // =========================================================

        if (
            !payment.router_id ||
            !payment.device_mac ||
            !payment.device_ip ||
            !payment.mikrotik_login_url
        ) {

            await client.query(
                "ROLLBACK"
            );


            return res.status(400).json({
                success: false,
                message:
                    "Payment is missing MikroTik connection information"
            });
        }


        // =================================================
        // CHECK EXISTING SESSION
        // =========================================================

        const existingSession =
            await client.query(
                `
                SELECT
                    id

                FROM internet_sessions

                WHERE payment_id = $1
                  AND company_id = $2

                LIMIT 1
                `,
                [
                    payment.id,
                    companyId
                ]
            );


        if (
            existingSession.rows.length > 0
        ) {

            await client.query(
                "ROLLBACK"
            );


            return res.status(409).json({
                success: false,
                message:
                    "Internet session already exists for this payment"
            });
        }


        // =================================================
        // RESOLVE PAYMENT AMOUNT
        // =========================================================

        const resolvedAmount =
            payment.amount !== null &&
            payment.amount !== undefined
                ? Number(
                    payment.amount
                )
                : Number(
                    payment.package_price
                );


        // =================================================
        // MARK PAYMENT SUCCESSFUL
        // =========================================================

        const updatedPaymentResult =
            await client.query(
                `
                UPDATE payments

                SET
                    amount = $3,
                    status = 'successful',
                    paid_at = CURRENT_TIMESTAMP

                WHERE id = $1
                  AND company_id = $2

                RETURNING
                    id,
                    company_id,
                    package_id,
                    phone_number,
                    payment_method,
                    amount,
                    transaction_reference,
                    status,

                    router_id,
                    device_mac,
                    device_ip,
                    mikrotik_login_url,

                    created_at,
                    paid_at
                `,
                [
                    payment.id,
                    companyId,
                    resolvedAmount
                ]
            );


        // =================================================
        // CREATE INTERNET SESSION
        // =========================================================

        const sessionResult =
            await client.query(
                `
                INSERT INTO internet_sessions (
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
                )

                VALUES (
                    $1,
                    $2,
                    $3,

                    $4,
                    $5,
                    $6,
                    $7,

                    CURRENT_TIMESTAMP,

                    CURRENT_TIMESTAMP +
                        ($8 * INTERVAL '1 minute'),

                    'active',
                    CURRENT_TIMESTAMP
                )

                RETURNING *
                `,
                [
                    companyId,
                    payment.id,
                    payment.package_id,

                    payment.router_id,
                    payment.device_mac,
                    payment.device_ip,
                    payment.mikrotik_login_url,

                    payment.duration_minutes
                ]
            );


        // =================================================
        // PROVISION MIKROTIK ACCESS
        // =========================================================

        await provisionPaymentOnMikrotik(
            payment
        );


        // =================================================
        // COMMIT
        // =========================================================

        await client.query(
            "COMMIT"
        );


        // =================================================
        // BUILD COMPLETE RESPONSE
        // =========================================================

        const updatedPayment = {

            ...updatedPaymentResult.rows[0],

            amount:
                resolvedAmount,

            package_name:
                payment.package_name,

            package_price:
                payment.package_price,

            duration_minutes:
                payment.duration_minutes
        };


        return res.status(200).json({

            success: true,

            message:
                "Cash payment confirmed and internet access activated",

            payment:
                updatedPayment,

            session:
                sessionResult.rows[0]
        });

    } catch (error) {

        try {

            await client.query(
                "ROLLBACK"
            );

        } catch (rollbackError) {

            console.error(
                "Cash confirmation rollback error:",
                rollbackError.message
            );
        }


        console.error(
            "Confirm cash payment error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message:
                "Failed to confirm cash payment or activate internet access"
        });

    } finally {

        client.release();
    }
};


// =========================================================
// DEVELOPMENT PAYMENT SUCCESS
// =========================================================

const markPaymentSuccessful = async (
    req,
    res
) => {

    const client =
        await pool.connect();


    try {

        const companyId =
            getRequestCompanyId(req);


        const transactionReference =
            req.params.reference
                ?.trim();


        if (!transactionReference) {

            return res.status(400).json({
                success: false,
                message:
                    "Payment reference is required"
            });
        }


        await client.query(
            "BEGIN"
        );


        // =================================================
        // FIND AND LOCK PAYMENT
        // =========================================================

        const paymentResult =
            await client.query(
                `
                SELECT
                    pay.id,
                    pay.company_id,
                    pay.package_id,
                    pay.phone_number,
                    pay.payment_method,
                    pay.amount,
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

                WHERE pay.transaction_reference = $1
                  AND pay.company_id = $2

                LIMIT 1

                FOR UPDATE OF pay
                `,
                [
                    transactionReference,
                    companyId
                ]
            );


        if (
            paymentResult.rows.length === 0
        ) {

            await client.query(
                "ROLLBACK"
            );


            return res.status(404).json({
                success: false,
                message:
                    "Payment not found"
            });
        }


        const payment =
            paymentResult.rows[0];


        // =================================================
        // CASH MUST USE ADMIN CONFIRMATION
        // =========================================================

        if (
            payment.payment_method ===
            "cash"
        ) {

            await client.query(
                "ROLLBACK"
            );


            return res.status(400).json({
                success: false,
                message:
                    "Cash payments must be confirmed by the company administrator"
            });
        }


        // =================================================
        // PREVENT DUPLICATE SUCCESS
        // =========================================================

        if (
            payment.status ===
            "successful"
        ) {

            await client.query(
                "ROLLBACK"
            );


            return res.status(409).json({
                success: false,
                message:
                    "Payment has already been marked successful"
            });
        }


        // =================================================
        // REQUIRE MIKROTIK CONTEXT
        // =========================================================

        if (
            !payment.router_id ||
            !payment.device_mac ||
            !payment.device_ip ||
            !payment.mikrotik_login_url
        ) {

            await client.query(
                "ROLLBACK"
            );


            return res.status(400).json({
                success: false,
                message:
                    "Payment is missing MikroTik connection information"
            });
        }


        // =================================================
        // CHECK EXISTING SESSION
        // =========================================================

        const existingSession =
            await client.query(
                `
                SELECT
                    id

                FROM internet_sessions

                WHERE payment_id = $1
                  AND company_id = $2

                LIMIT 1
                `,
                [
                    payment.id,
                    companyId
                ]
            );


        if (
            existingSession.rows.length > 0
        ) {

            await client.query(
                "ROLLBACK"
            );


            return res.status(409).json({
                success: false,
                message:
                    "Internet session already exists for this payment"
            });
        }


        // =================================================
        // RESOLVE PAYMENT AMOUNT
        // =========================================================

        const resolvedAmount =
            payment.amount !== null &&
            payment.amount !== undefined
                ? Number(
                    payment.amount
                )
                : Number(
                    payment.package_price
                );


        // =================================================
        // MARK PAYMENT SUCCESSFUL
        // =========================================================

        const updatedPaymentResult =
            await client.query(
                `
                UPDATE payments

                SET
                    amount = $3,
                    status = 'successful',
                    paid_at = CURRENT_TIMESTAMP

                WHERE id = $1
                  AND company_id = $2

                RETURNING
                    id,
                    company_id,
                    package_id,
                    phone_number,
                    payment_method,
                    amount,
                    transaction_reference,
                    status,

                    router_id,
                    device_mac,
                    device_ip,
                    mikrotik_login_url,

                    created_at,
                    paid_at
                `,
                [
                    payment.id,
                    companyId,
                    resolvedAmount
                ]
            );


        // =================================================
        // CREATE INTERNET SESSION
        // =========================================================

        const sessionResult =
            await client.query(
                `
                INSERT INTO internet_sessions (
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
                )

                VALUES (
                    $1,
                    $2,
                    $3,

                    $4,
                    $5,
                    $6,
                    $7,

                    CURRENT_TIMESTAMP,

                    CURRENT_TIMESTAMP +
                        ($8 * INTERVAL '1 minute'),

                    'active',
                    CURRENT_TIMESTAMP
                )

                RETURNING *
                `,
                [
                    companyId,
                    payment.id,
                    payment.package_id,

                    payment.router_id,
                    payment.device_mac,
                    payment.device_ip,
                    payment.mikrotik_login_url,

                    payment.duration_minutes
                ]
            );


        // =================================================
        // PROVISION MIKROTIK ACCESS
        // =========================================================

        await provisionPaymentOnMikrotik(
            payment
        );


        // =================================================
        // COMMIT
        // =========================================================

        await client.query(
            "COMMIT"
        );


        const updatedPayment = {

            ...updatedPaymentResult.rows[0],

            amount:
                resolvedAmount,

            package_name:
                payment.package_name,

            package_price:
                payment.package_price,

            duration_minutes:
                payment.duration_minutes
        };


        return res.status(200).json({

            success: true,

            message:
                "Payment marked successful and internet access activated",

            payment:
                updatedPayment,

            session:
                sessionResult.rows[0]
        });

    } catch (error) {

        try {

            await client.query(
                "ROLLBACK"
            );

        } catch (rollbackError) {

            console.error(
                "Payment success rollback error:",
                rollbackError.message
            );
        }


        console.error(
            "Mark payment successful error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message:
                "Failed to mark payment successful or activate internet access"
        });

    } finally {

        client.release();
    }
};


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