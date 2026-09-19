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

// Send one authenticated request to the RouterOS REST API and parse its response.

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

            request.setTimeout(10_000, () => {
                request.destroy(new Error('MikroTik REST request timed out'));
            });


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

// Return active RouterOS sessions so stale access can be removed before renewal.

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

// Return hotspot host entries used to verify and refresh a device connection.

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

// Remove user records matching the device so RouterOS starts a fresh uptime limit.

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

// Disconnect an existing active session before provisioning replacement access.

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

// Remove the unauthenticated host entry so RouterOS retries MAC authentication.

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

// Replace the device's RouterOS user with access for the purchased duration.

// =========================================================
// PROVISION HOTSPOT ACCESS
// =========================================================

export const provisionHotspotAccess =
    async ({
        macAddress,
        durationMinutes,
        remainingSeconds,
        getRemainingSeconds
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


        let limitUptime = remainingSeconds === undefined
            ? formatDuration(durationMinutes)
            : formatRemainingDuration(remainingSeconds);


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

        if (getRemainingSeconds) {
            limitUptime = formatRemainingDuration(await getRemainingSeconds());
        }


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
                        durationMinutes ?? remainingSeconds / 60
                    ),

                limitUptime
            }
        );


        return newUser;
    };

export const formatRemainingDuration = seconds => {
    if (!Number.isSafeInteger(seconds) || seconds <= 0) {
        throw new Error('Remaining duration must be a positive number of seconds');
    }
    return `${seconds}s`;
};

// Confirm that a router mapping is allowed to use the configured credentials.
// Verify the device is connected to the configured router before restoring access.
// The existing deployment has one server-side credential pair and REST target.
// Reject other mappings rather than sending another tenant's MAC to that router.
export const assertConfiguredRouter = router => {
    if (router.host !== MIKROTIK_HOST || router.public_id !==
        (process.env.MIKROTIK_ROUTER_PUBLIC_ID || 'NMS-LOCAL-ROUTER-001')) {
        throw new Error('REST credentials are not configured for this router');
    }
};

export const restoreHotspotAccess = async ({ router, macAddress, ipAddress, getRemainingSeconds }) => {
    assertConfiguredRouter(router);
    const mac = macAddress.trim().toUpperCase();
    const hosts = await getHotspotHosts();
    if (!hosts.some(host => String(host['mac-address']).toUpperCase() === mac &&
        (host.address === ipAddress || host['to-address'] === ipAddress))) {
        throw new Error('Device connection could not be verified on the router');
    }
    const active = await getActiveHotspotUsers();
    const remainingSeconds = await getRemainingSeconds();
    formatRemainingDuration(remainingSeconds);
    const connection = active.find(user => String(user['mac-address']).toUpperCase() === mac && user.user === mac);
    // Repeated checks must not interrupt an already correctly timed connection.
    const timeLeft = parseRouterDuration(connection?.['session-time-left']);
    if (timeLeft !== null && timeLeft > 0 && timeLeft <= remainingSeconds) {
        return { restored: false, remainingSeconds };
    }
    await provisionHotspotAccess({ macAddress: mac, remainingSeconds, getRemainingSeconds });
    return { restored: true, remainingSeconds };
};

// Convert RouterOS duration strings into seconds for renewal comparisons.
export const parseRouterDuration = value => {
    if (typeof value !== 'string' || !/^(?:\d+w)?(?:\d+d)?(?:\d+h)?(?:\d+m)?(?:\d+s)?$/.test(value) || !value) return null;
    const units = { w: 604800, d: 86400, h: 3600, m: 60, s: 1 };
    return [...value.matchAll(/(\d+)([wdhms])/g)].reduce((sum, match) => sum + Number(match[1]) * units[match[2]], 0);
};
