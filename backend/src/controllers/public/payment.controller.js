// Import PostgreSQL connection pool
import { pool } from "../../database/database.js";


// =========================================================
// COMPANY LOOKUP
// =========================================================

// Find an active company using its public slug
const findCompanyBySlug = async (companySlug) => {

    const result = await pool.query(
        `
        SELECT
            id,
            name,
            slug,
            status
        FROM companies
        WHERE slug = $1
          AND status = 'active'
        LIMIT 1
        `,
        [
            companySlug
        ]
    );


    if (result.rows.length === 0) {
        return null;
    }


    return result.rows[0];
};


// =========================================================
// ROUTER LOOKUP
// =========================================================

// Resolve one active MikroTik router belonging to the company
const findCompanyRouter = async (
    routerPublicId,
    companyId
) => {

    const result = await pool.query(
        `
        SELECT
            id,
            company_id,
            name,
            public_id,
            host,
            api_port,
            status
        FROM mikrotik_routers
        WHERE public_id = $1
          AND company_id = $2
          AND status = 'active'
        LIMIT 1
        `,
        [
            routerPublicId,
            companyId
        ]
    );


    if (result.rows.length === 0) {
        return null;
    }


    return result.rows[0];
};


// =========================================================
// PAYMENT REFERENCES
// =========================================================

// Generate a mobile payment transaction reference
const generateMobilePaymentReference = () => {

    return `MOBILEPAYMENT-${Date.now()}-${Math.floor(
        Math.random() * 1000000
    )}`;
};


// Generate a cash payment transaction reference
const generateCashPaymentReference = () => {

    return `CASHPAYMENT-${Date.now()}-${Math.floor(
        Math.random() * 1000000
    )}`;
};


// =========================================================
// MIKROTIK CONTEXT VALIDATION
// =========================================================

// Validate captive portal information
const hasValidMikrotikContext = ({
    mac,
    ip,
    router,
    login_url
}) => {

    return Boolean(
        mac &&
        ip &&
        router &&
        login_url
    );
};


// =========================================================
// INITIATE MOBILE PAYMENT
// =========================================================

const initiatePayment = async (
    req,
    res
) => {

    try {

        // Get company slug from public URL
        const companySlug =
            req.params.companySlug
                ?.trim()
                .toLowerCase();


        // Read payment and MikroTik context
        const {
            package_id,
            payment_method,
            phone_number,
            mac,
            ip,
            router,
            login_url
        } = req.body;


        // Validate company
        if (!companySlug) {

            return res.status(400).json({
                success: false,
                message: "Company is required"
            });
        }


        // Validate payment fields
        if (
            !package_id ||
            !payment_method ||
            !phone_number
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Package, payment method and phone number are required"
            });
        }


        // Validate captive portal context
        if (
            !hasValidMikrotikContext({
                mac,
                ip,
                router,
                login_url
            })
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "MikroTik connection information is missing"
            });
        }


        // Normalize package ID
        const packageId =
            Number(
                package_id
            );


        if (
            !Number.isInteger(packageId) ||
            packageId <= 0
        ) {

            return res.status(400).json({
                success: false,
                message: "Invalid package ID"
            });
        }


        // Resolve company
        const company =
            await findCompanyBySlug(
                companySlug
            );


        if (!company) {

            return res.status(404).json({
                success: false,
                message: "Company not found"
            });
        }


        // Resolve MikroTik router
        const selectedRouter =
            await findCompanyRouter(
                router,
                company.id
            );


        if (!selectedRouter) {

            return res.status(400).json({
                success: false,
                message:
                    "Router not found or unavailable"
            });
        }


        // Load trusted package
        const packageResult =
            await pool.query(
                `
                SELECT
                    id,
                    company_id,
                    name,
                    price,
                    duration_minutes,
                    speed
                FROM packages
                WHERE id = $1
                  AND company_id = $2
                  AND is_active = TRUE
                  AND (
                        available_from IS NULL
                        OR available_from <= CURRENT_TIMESTAMP
                      )
                  AND (
                        available_until IS NULL
                        OR available_until >= CURRENT_TIMESTAMP
                      )
                LIMIT 1
                `,
                [
                    packageId,
                    company.id
                ]
            );


        if (
            packageResult.rows.length === 0
        ) {

            return res.status(404).json({
                success: false,
                message:
                    "Package not found or unavailable"
            });
        }


        const selectedPackage =
            packageResult.rows[0];


        // Generate transaction reference
        const transactionReference =
            generateMobilePaymentReference();


        // Create payment with captive/router context
        const result =
            await pool.query(
                `
                INSERT INTO payments (
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
                    created_at
                )

                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    'pending',
                    $7,
                    $8,
                    $9,
                    $10,
                    CURRENT_TIMESTAMP
                )

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
                    created_at
                `,
                [
                    company.id,
                    selectedPackage.id,
                    phone_number.trim(),
                    payment_method.trim(),
                    selectedPackage.price,
                    transactionReference,
                    selectedRouter.id,
                    mac.trim(),
                    ip.trim(),
                    login_url.trim()
                ]
            );


        // TODO:
        // Connect the real mobile-money provider here later.


        return res.status(201).json({

            success: true,

            message:
                "Payment initiated successfully",

            payment:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "Initiate payment error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message:
                "Failed to initiate payment"
        });
    }
};


// =========================================================
// CREATE CASH PAYMENT REQUEST
// =========================================================

const createCashPaymentRequest = async (
    req,
    res
) => {

    try {

        // Get company slug
        const companySlug =
            req.params.companySlug
                ?.trim()
                .toLowerCase();


        // Read payment and MikroTik information
        const {
            package_id,
            phone_number,
            mac,
            ip,
            router,
            login_url
        } = req.body;


        // Validate required payment fields
        if (
            !companySlug ||
            !package_id ||
            !phone_number
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Company, package and phone number are required"
            });
        }


        // Validate captive portal information
        if (
            !hasValidMikrotikContext({
                mac,
                ip,
                router,
                login_url
            })
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "MikroTik connection information is missing"
            });
        }


        // Normalize package ID
        const packageId =
            Number(
                package_id
            );


        if (
            !Number.isInteger(packageId) ||
            packageId <= 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid package ID"
            });
        }


        // Resolve company
        const company =
            await findCompanyBySlug(
                companySlug
            );


        if (!company) {

            return res.status(404).json({
                success: false,
                message:
                    "Company not found"
            });
        }


        // Resolve company's MikroTik router
        const selectedRouter =
            await findCompanyRouter(
                router,
                company.id
            );


        if (!selectedRouter) {

            return res.status(400).json({
                success: false,
                message:
                    "Router not found or unavailable"
            });
        }


        // Load trusted package
        const packageResult =
            await pool.query(
                `
                SELECT
                    id,
                    company_id,
                    name,
                    price,
                    duration_minutes,
                    speed
                FROM packages
                WHERE id = $1
                  AND company_id = $2
                  AND is_active = TRUE
                  AND (
                        available_from IS NULL
                        OR available_from <= CURRENT_TIMESTAMP
                      )
                  AND (
                        available_until IS NULL
                        OR available_until >= CURRENT_TIMESTAMP
                      )
                LIMIT 1
                `,
                [
                    packageId,
                    company.id
                ]
            );


        if (
            packageResult.rows.length === 0
        ) {

            return res.status(404).json({
                success: false,
                message:
                    "Package not found or unavailable"
            });
        }


        const selectedPackage =
            packageResult.rows[0];


        // Generate cash transaction reference
        const transactionReference =
            generateCashPaymentReference();


        // Create cash payment request with MikroTik context
        const result =
            await pool.query(
                `
                INSERT INTO payments (
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
                    created_at
                )

                VALUES (
                    $1,
                    $2,
                    $3,
                    'cash',
                    $4,
                    $5,
                    'awaiting_cash_confirmation',
                    $6,
                    $7,
                    $8,
                    $9,
                    CURRENT_TIMESTAMP
                )

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
                    created_at
                `,
                [
                    company.id,
                    selectedPackage.id,
                    phone_number.trim(),
                    selectedPackage.price,
                    transactionReference,
                    selectedRouter.id,
                    mac.trim(),
                    ip.trim(),
                    login_url.trim()
                ]
            );


        return res.status(201).json({

            success: true,

            message:
                "Cash payment request created successfully",

            payment:
                result.rows[0]
        });

    } catch (error) {

        console.error(
            "Cash payment request error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message:
                "Failed to create cash payment request"
        });
    }
};


// =========================================================
// GET PUBLIC PAYMENT STATUS
// =========================================================

const getPaymentStatus = async (
    req,
    res
) => {

    try {

        // Get company and transaction reference
        const companySlug =
            req.params.companySlug
                ?.trim()
                .toLowerCase();


        const transactionReference =
            req.params.reference
                ?.trim();


        if (
            !companySlug ||
            !transactionReference
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Company and payment reference are required"
            });
        }


        // Resolve company
        const company =
            await findCompanyBySlug(
                companySlug
            );


        if (!company) {

            return res.status(404).json({
                success: false,
                message:
                    "Company not found"
            });
        }


        // Load payment
        const paymentResult =
            await pool.query(
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
                    p.duration_minutes,
                    p.speed

                FROM payments pay

                JOIN packages p
                    ON p.id = pay.package_id
                   AND p.company_id = pay.company_id

                WHERE pay.company_id = $1
                  AND pay.transaction_reference = $2

                LIMIT 1
                `,
                [
                    company.id,
                    transactionReference
                ]
            );


        if (
            paymentResult.rows.length === 0
        ) {

            return res.status(404).json({
                success: false,
                message:
                    "Payment not found"
            });
        }


        const payment =
            paymentResult.rows[0];


        // Load session created from payment
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
                    payment.id,
                    company.id
                ]
            );


        return res.status(200).json({

            success: true,

            payment,

            session:
                sessionResult.rows.length > 0
                    ? sessionResult.rows[0]
                    : null
        });

    } catch (error) {

        console.error(
            "Get payment status error:",
            error.message
        );


        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch payment status"
        });
    }
};


// =========================================================
// EXPORTS
// =========================================================

export {
    initiatePayment,
    createCashPaymentRequest,
    getPaymentStatus
};