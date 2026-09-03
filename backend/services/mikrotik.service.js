import https from 'https';


// =========================================================
// MIKROTIK REST CONFIGURATION
// =========================================================

const MIKROTIK_HOST =
    '192.168.88.1';

const MIKROTIK_PORT =
    443;

const HOTSPOT_SERVER =
    'hotspot1';

const HOTSPOT_PROFILE =
    'default';


// =========================================================
// BASIC AUTHENTICATION
// =========================================================

const getAuthorizationHeader = () => {

    const username =
        process.env.MIKROTIK_USERNAME;

    const password =
        process.env.MIKROTIK_PASSWORD;


    if (
        !username ||
        !password
    ) {

        throw new Error(
            'MikroTik credentials are missing from environment variables'
        );
    }


    const credentials =
        Buffer
            .from(
                `${username}:${password}`
            )
            .toString(
                'base64'
            );


    return `Basic ${credentials}`;
};


// =========================================================
// GENERIC MIKROTIK REST REQUEST
// =========================================================

const mikrotikRequest = (
    path,
    method = 'GET',
    body = null
) => {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const payload =
                body
                    ? JSON.stringify(
                        body
                    )
                    : null;


            const options = {

                hostname:
                    MIKROTIK_HOST,

                port:
                    MIKROTIK_PORT,

                path:
                    `/rest${path}`,

                method,

                headers: {

                    Authorization:
                        getAuthorizationHeader(),

                    Accept:
                        'application/json',

                    'Content-Type':
                        'application/json'
                },


                // LOCAL DEVELOPMENT ONLY.
                // The MikroTik currently uses a
                // locally generated certificate.
                rejectUnauthorized:
                    false
            };


            if (payload) {

                options.headers[
                    'Content-Length'
                ] =
                    Buffer.byteLength(
                        payload
                    );
            }


            const request =
                https.request(
                    options,
                    (
                        response
                    ) => {

                        let responseBody =
                            '';


                        response.on(
                            'data',
                            (
                                chunk
                            ) => {

                                responseBody +=
                                    chunk;
                            }
                        );


                        response.on(
                            'end',
                            () => {

                                const statusCode =
                                    response.statusCode ||
                                    500;


                                let parsedBody =
                                    null;


                                if (responseBody) {

                                    try {

                                        parsedBody =
                                            JSON.parse(
                                                responseBody
                                            );

                                    } catch {

                                        parsedBody =
                                            responseBody;
                                    }
                                }


                                if (
                                    statusCode < 200 ||
                                    statusCode >= 300
                                ) {

                                    reject(
                                        new Error(
                                            `MikroTik REST API returned ${statusCode}: ${responseBody}`
                                        )
                                    );

                                    return;
                                }


                                resolve(
                                    parsedBody
                                );
                            }
                        );
                    }
                );


            request.on(
                'error',
                (
                    error
                ) => {

                    reject(
                        error
                    );
                }
            );


            if (payload) {

                request.write(
                    payload
                );
            }


            request.end();
        }
    );
};


// =========================================================
// FORMAT PACKAGE DURATION
// =========================================================

const formatDuration = (
    durationMinutes
) => {

    const minutes =
        Number(
            durationMinutes
        );


    if (
        !Number.isInteger(
            minutes
        ) ||
        minutes <= 0
    ) {

        throw new Error(
            'Invalid package duration'
        );
    }


    const days =
        Math.floor(
            minutes / 1440
        );


    const remainingAfterDays =
        minutes % 1440;


    const hours =
        Math.floor(
            remainingAfterDays / 60
        );


    const remainingMinutes =
        remainingAfterDays % 60;


    let result =
        '';


    if (
        days > 0
    ) {

        result +=
            `${days}d`;
    }


    if (
        hours > 0
    ) {

        result +=
            `${hours}h`;
    }


    if (
        remainingMinutes > 0
    ) {

        result +=
            `${remainingMinutes}m`;
    }


    return result;
};


// =========================================================
// TEST CONNECTION
// =========================================================

export const testMikrotikConnection =
    async () => {

        const identity =
            await mikrotikRequest(
                '/system/identity'
            );


        console.log(
            'MikroTik connected:',
            identity
        );


        return identity;
    };


// =========================================================
// GET ACTIVE HOTSPOT USERS
// =========================================================

export const getActiveHotspotUsers =
    async () => {

        const activeUsers =
            await mikrotikRequest(
                '/ip/hotspot/active'
            );


        return Array.isArray(
            activeUsers
        )
            ? activeUsers
            : [];
    };


// =========================================================
// GET HOTSPOT USERS
// =========================================================

export const getHotspotUsers =
    async () => {

        const users =
            await mikrotikRequest(
                '/ip/hotspot/user'
            );


        return Array.isArray(
            users
        )
            ? users
            : [];
    };


// =========================================================
// GET HOTSPOT HOSTS
// =========================================================

export const getHotspotHosts =
    async () => {

        const hosts =
            await mikrotikRequest(
                '/ip/hotspot/host'
            );


        return Array.isArray(
            hosts
        )
            ? hosts
            : [];
    };


// =========================================================
// DELETE EXISTING HOTSPOT USER FOR MAC
// =========================================================

const deleteExistingHotspotUser =
    async (
        macAddress
    ) => {

        const normalizedMac =
            macAddress
                .trim()
                .toUpperCase();


        const users =
            await getHotspotUsers();


        const matchingUsers =
            users.filter(
                (
                    user
                ) => {

                    const username =
                        String(
                            user.name ||
                            ''
                        )
                            .trim()
                            .toUpperCase();


                    const userMac =
                        String(
                            user[
                                'mac-address'
                            ] ||
                            ''
                        )
                            .trim()
                            .toUpperCase();


                    return (
                        username ===
                            normalizedMac ||
                        userMac ===
                            normalizedMac
                    );
                }
            );


        for (
            const user
            of matchingUsers
        ) {

            const id =
                user[
                    '.id'
                ];


            if (!id) {

                continue;
            }


            await mikrotikRequest(
                `/ip/hotspot/user/${encodeURIComponent(id)}`,
                'DELETE'
            );
        }
    };


// =========================================================
// REMOVE ACTIVE HOTSPOT SESSION FOR MAC
// =========================================================

const removeExistingActiveHotspotSession =
    async (
        macAddress
    ) => {

        const normalizedMac =
            macAddress
                .trim()
                .toUpperCase();


        const activeUsers =
            await getActiveHotspotUsers();


        const matchingActiveUsers =
            activeUsers.filter(
                (
                    activeUser
                ) => {

                    const activeMac =
                        String(
                            activeUser[
                                'mac-address'
                            ] ||
                            ''
                        )
                            .trim()
                            .toUpperCase();


                    return (
                        activeMac ===
                        normalizedMac
                    );
                }
            );


        for (
            const activeUser
            of matchingActiveUsers
        ) {

            const id =
                activeUser[
                    '.id'
                ];


            if (!id) {

                continue;
            }


            await mikrotikRequest(
                `/ip/hotspot/active/${encodeURIComponent(id)}`,
                'DELETE'
            );
        }
    };


// =========================================================
// REMOVE EXISTING HOTSPOT HOST
// =========================================================

export const removeExistingHotspotHost =
    async (
        macAddress
    ) => {

        const normalizedMac =
            macAddress
                .trim()
                .toUpperCase();


        const hosts =
            await getHotspotHosts();


        const matchingHosts =
            hosts.filter(
                (
                    host
                ) => {

                    const hostMac =
                        String(
                            host[
                                'mac-address'
                            ] ||
                            ''
                        )
                            .trim()
                            .toUpperCase();


                    return (
                        hostMac ===
                        normalizedMac
                    );
                }
            );


        for (
            const host
            of matchingHosts
        ) {

            const id =
                host[
                    '.id'
                ];


            if (!id) {

                continue;
            }


            await mikrotikRequest(
                `/ip/hotspot/host/${encodeURIComponent(id)}`,
                'DELETE'
            );
        }
    };


// =========================================================
// PROVISION HOTSPOT ACCESS
// =========================================================

export const provisionHotspotAccess =
    async ({
        macAddress,
        durationMinutes
    }) => {

        if (!macAddress) {

            throw new Error(
                'Device MAC address is required'
            );
        }


        const normalizedMac =
            macAddress
                .trim()
                .toUpperCase();


        const limitUptime =
            formatDuration(
                durationMinutes
            );


        // =================================================
        // REMOVE OLD ACTIVE SESSION
        // =========================================================
        //
        // If this device already has an active session,
        // disconnect it before replacing its access.
        //
        // This prevents an old session from continuing
        // after a new package/payment is provisioned.
        // =========================================================

        await removeExistingActiveHotspotSession(
            normalizedMac
        );


        // =================================================
        // REMOVE OLD HOTSPOT USER
        // =========================================================
        //
        // Removing the old user resets its RouterOS
        // uptime counter. A fresh paid package therefore
        // starts with its full purchased duration.
        // =========================================================

        await deleteExistingHotspotUser(
            normalizedMac
        );


        // =================================================
        // CREATE FRESH PAID HOTSPOT USER
        // =========================================================

        const newUser =
            await mikrotikRequest(
                '/ip/hotspot/user',
                'PUT',
                {
                    name:
                        normalizedMac,

                    'mac-address':
                        normalizedMac,

                    server:
                        HOTSPOT_SERVER,

                    profile:
                        HOTSPOT_PROFILE,

                    'limit-uptime':
                        limitUptime
                }
            );


        // =================================================
        // REMOVE STALE UNAUTHENTICATED HOST ENTRY
        // =========================================================
        //
        // This is critical.
        //
        // A customer may already be present in:
        //
        // /ip hotspot host
        //
        // before payment succeeds.
        //
        // Simply creating the HotSpot user does not always
        // cause RouterOS to immediately retry MAC auth.
        //
        // Removing the host forces RouterOS to recreate the
        // host entry and perform MAC authentication using
        // the newly created paid HotSpot user.
        // =========================================================

        await removeExistingHotspotHost(
            normalizedMac
        );


        console.log(
            'MikroTik HotSpot access provisioned:',
            {
                macAddress:
                    normalizedMac,

                durationMinutes:
                    Number(
                        durationMinutes
                    ),

                limitUptime
            }
        );


        return newUser;
    };