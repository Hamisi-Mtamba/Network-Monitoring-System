import { setTimeout as delay } from 'node:timers/promises';

const METHODS = Object.freeze({

    // Primary customer-facing mobile-money flow.
    lipa: 'LIPA',

    // Legacy payment methods remain supported.
    mpesa: 'MPESA',
    airtel_money: 'AIRTELMONEY',
    mixx_by_yas: 'MIXX',
    halopesa: 'HALOPESA',

    // Cash uses its own confirmation flow.
    cash: 'CASH'
});

// Use one error type so callers can map input and conflict failures to HTTP status codes.

export class PaymentReferenceError extends Error {

    constructor(
        message,
        status = 400
    ) {

        super(message);

        this.status = status;
    }
}


// =========================================================
// NORMALIZE PAYMENT IDENTITY
// =========================================================

// Validate and canonicalize the values that make a payment reference unique.
export const normalizePaymentIdentity = ({
    paymentMethod,
    phoneNumber,
    macAddress
}) => {

    const method =
        typeof paymentMethod === 'string'
            ? paymentMethod
                .trim()
                .toLowerCase()
            : '';


    if (
        !Object.hasOwn(
            METHODS,
            method
        )
    ) {

        throw new PaymentReferenceError(
            'Unsupported payment method'
        );
    }


    let phone =
        typeof phoneNumber === 'string'
            ? phoneNumber
                .trim()
                .replace(/^\+/, '')
            : '';


    // Convert local Tanzanian format:
    //
    // 0769751290
    //
    // to:
    //
    // 255769751290
    if (
        /^0[67]\d{8}$/.test(
            phone
        )
    ) {

        phone =
            `255${phone.slice(1)}`;
    }


    if (
        !/^255[67]\d{8}$/.test(
            phone
        )
    ) {

        throw new PaymentReferenceError(
            'Invalid Tanzanian mobile number'
        );
    }


    // Normalize MAC:
    //
    // 22:E5:8A:ED:14:46
    //
    // becomes:
    //
    // 22E58AED1446
    const mac =
        typeof macAddress === 'string'
            ? macAddress
                .replace(
                    /[:\-\s]/g,
                    ''
                )
                .toUpperCase()
            : '';


    if (
        !/^[0-9A-F]{12}$/.test(
            mac
        )
    ) {

        throw new PaymentReferenceError(
            'Invalid device MAC address'
        );
    }


    return {
        method,
        phone,
        mac
    };
};


// =========================================================
// GENERATE TRANSACTION REFERENCE
// =========================================================

// endingTime is PostgreSQL-generated:
//
// YYYYMMDDHHmmss
//
// PostgreSQL generates the timestamp so payment expiry/reference
// construction does not depend on the Node server timezone.

export const generateTransactionReference = ({
    paymentMethod,
    phoneNumber,
    macAddress,
    endingTime
}) => {

    const {
        method,
        phone,
        mac
    } =
        normalizePaymentIdentity({
            paymentMethod,
            phoneNumber,
            macAddress
        });


    if (
        typeof endingTime !== 'string' ||
        !/^\d{14}$/.test(
            endingTime
        )
    ) {

        throw new PaymentReferenceError(
            'Invalid reference ending time'
        );
    }


    const iso =
        `${endingTime.slice(0, 4)}-` +
        `${endingTime.slice(4, 6)}-` +
        `${endingTime.slice(6, 8)}T` +
        `${endingTime.slice(8, 10)}:` +
        `${endingTime.slice(10, 12)}:` +
        `${endingTime.slice(12)}.000Z`;


    const date =
        new Date(
            iso
        );


    if (
        !Number.isFinite(
            date.getTime()
        ) ||
        date.toISOString() !== iso
    ) {

        throw new PaymentReferenceError(
            'Invalid reference ending time'
        );
    }


    return (
        `${METHODS[method]}-` +
        `${phone}-` +
        `${mac}-` +
        `${endingTime}`
    );
};


// =========================================================
// CREATE REFERENCED PAYMENT
// =========================================================

// Create an isolated payment attempt and supersede only its matching predecessor.
export const createReferencedPayment = async (
    {
        db,
        companyId,
        packageId,
        routerId,
        paymentMethod,
        phoneNumber,
        macAddress,
        ipAddress,
        loginUrl
    },
    {
        wait = delay
    } = {}
) => {

    const identity =
        normalizePaymentIdentity({
            paymentMethod,
            phoneNumber,
            macAddress
        });


    // Store MAC in canonical colon-separated format.
    //
    // 22E58AED1446
    //
    // ->
    //
    // 22:E5:8A:ED:14:46
    const deviceMac =
        identity.mac
            .match(
                /.{2}/g
            )
            .join(':');


    // Cash must remain independent from mobile-money retries.
    const isCash =
        identity.method ===
        'cash';


    for (
        let attempt = 0;
        attempt < 5;
        attempt++
    ) {

        /*
         * A dedicated PostgreSQL client is used when available so:
         *
         * 1. old equivalent pending payments are cancelled
         * 2. the new payment is inserted
         *
         * inside one database transaction.
         */
        const client =
            typeof db.connect === 'function'
                ? await db.connect()
                : db;


        const shouldRelease =
            client !== db &&
            typeof client.release === 'function';


        try {

            await client.query(
                'BEGIN'
            );


            /*
             * Serialize creation of equivalent payment attempts.
             *
             * This prevents two almost-simultaneous requests from both
             * creating active pending payments for the same payer/device.
             *
             * pg_advisory_xact_lock automatically releases at COMMIT
             * or ROLLBACK.
             */
            if (
                !isCash
            ) {

                await client.query(
                    `
                    SELECT pg_advisory_xact_lock(
                        hashtext(
                            $1::text ||
                            ':' ||
                            $2::text ||
                            ':' ||
                            $3::text ||
                            ':' ||
                            $4::text ||
                            ':' ||
                            $5::text
                        )
                    )
                    `,
                    [
                        companyId,
                        packageId,
                        identity.phone,
                        deviceMac,
                        identity.method
                    ]
                );
            }


            // =================================================
            // LOAD TRUSTED PACKAGE + CURRENT TIME
            // =================================================

            const timing =
                await client.query(
                    `
                    WITH moment AS MATERIALIZED (
                        SELECT
                            clock_timestamp()::timestamp
                                AS started_at
                    )

                    SELECT
                        p.price,
                        p.duration_minutes,

                        to_char(
                            moment.started_at,
                            'YYYY-MM-DD HH24:MI:SS.US'
                        ) AS started_at,

                        to_char(
                            moment.started_at +
                                p.duration_minutes *
                                INTERVAL '1 minute',
                            'YYYYMMDDHH24MISS'
                        ) AS ending_time

                    FROM packages p

                    CROSS JOIN moment

                    WHERE p.id = $1
                      AND p.company_id = $2
                      AND p.is_active = TRUE

                      AND (
                            p.available_from IS NULL
                            OR
                            p.available_from <=
                                CURRENT_TIMESTAMP
                      )

                      AND (
                            p.available_until IS NULL
                            OR
                            p.available_until >=
                                CURRENT_TIMESTAMP
                      )
                    `,
                    [
                        packageId,
                        companyId
                    ]
                );


            const purchasedPackage =
                timing.rows[0];


            if (
                !purchasedPackage
            ) {

                throw new PaymentReferenceError(
                    'Package not found or unavailable',
                    404
                );
            }


            const durationMinutes =
                Number(
                    purchasedPackage
                        .duration_minutes
                );


            if (
                !Number.isSafeInteger(
                    durationMinutes
                ) ||
                durationMinutes <= 0
            ) {

                throw new PaymentReferenceError(
                    'Package duration is invalid',
                    409
                );
            }


            // =================================================
            // SUPERSEDE OLD MOBILE PAYMENT ATTEMPTS
            // =================================================

            /*
             * IMPORTANT:
             *
             * Only mobile-money attempts are affected here.
             *
             * We cancel an older pending payment only when all of
             * these identities match:
             *
             * - same company
             * - same package
             * - same payer phone
             * - same device MAC
             * - same payment method
             *
             * Therefore another customer's payment is never cancelled
             * simply because the amount happens to be equal.
             *
             * Cash requests are deliberately excluded.
             */
            if (
                !isCash
            ) {

                await client.query(
                    `
                    UPDATE payments

                    SET
                        status = 'cancelled'

                    WHERE company_id = $1
                      AND package_id = $2
                      AND phone_number = $3
                      AND device_mac = $4
                      AND payment_method = $5
                      AND status = 'pending'
                    `,
                    [
                        companyId,
                        packageId,
                        identity.phone,
                        deviceMac,
                        identity.method
                    ]
                );
            }


            // =================================================
            // GENERATE REFERENCE
            // =================================================

            const reference =
                generateTransactionReference({
                    paymentMethod:
                        identity.method,

                    phoneNumber:
                        identity.phone,

                    macAddress:
                        identity.mac,

                    endingTime:
                        purchasedPackage
                            .ending_time
                });


            // =================================================
            // INSERT PAYMENT
            // =================================================

            const result =
                await client.query(
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
                        $7,
                        $8,
                        $9,
                        $10,
                        $11,
                        $12::timestamp
                    )

                    ON CONFLICT (
                        transaction_reference
                    )
                    DO NOTHING

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
                        companyId,
                        packageId,
                        identity.phone,
                        identity.method,
                        purchasedPackage.price,
                        reference,

                        isCash
                            ? 'awaiting_cash_confirmation'
                            : 'pending',

                        routerId,
                        deviceMac,
                        ipAddress.trim(),
                        loginUrl.trim(),
                        purchasedPackage.started_at
                    ]
                );


            // =================================================
            // PAYMENT CREATED
            // =================================================

            if (
                result.rows.length > 0
            ) {

                await client.query(
                    'COMMIT'
                );


                return result;
            }


            /*
             * No row means the generated transaction reference
             * already existed.
             *
             * Roll back this attempt and wait until PostgreSQL's
             * clock can generate a different ending timestamp.
             */
            await client.query(
                'ROLLBACK'
            );


            if (
                attempt < 4
            ) {

                await wait(
                    1000
                );
            }

        } catch (error) {

            try {

                await client.query(
                    'ROLLBACK'
                );

            } catch {
                // Nothing else to do if rollback itself fails.
            }


            throw error;

        } finally {

            if (
                shouldRelease
            ) {

                client.release();
            }
        }
    }


    throw new PaymentReferenceError(
        'A matching payment was created concurrently. Please retry.',
        409
    );
};