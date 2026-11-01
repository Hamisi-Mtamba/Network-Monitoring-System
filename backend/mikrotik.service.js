import https from 'https';


// =========================================================
// DEFAULT ROUTEROS SETTINGS
// =========================================================
//
// Router hosts are no longer hardcoded here.
// Each router supplies its own host from mikrotik_routers.host.
//
// Environment credentials remain as a fallback for the
// current deployment. A router may later have its own
// api_username/api_password values.
// =========================================================

const DEFAULT_MIKROTIK_PORT = 443;
const HOTSPOT_SERVER = 'hotspot1';
const HOTSPOT_PROFILE = 'default';


// =========================================================
// VALIDATE ROUTER
// =========================================================

export const assertConfiguredRouter = router => {

    if (
        !router ||
        !router.host ||
        !String(router.host).trim()
    ) {
        throw new Error(
            'REST host is not configured for this router'
        );
    }


    if (
        router.status &&
        router.status !== 'active'
    ) {
        throw new Error(
            'Router is not active'
        );
    }
};


// =========================================================
// BASIC AUTHENTICATION
// =========================================================

const getAuthorizationHeader = router => {

    const hasRouterCredentials =
        router?.api_username &&
        router?.api_password;


    const username =
        hasRouterCredentials
            ? router.api_username
            : process.env.MIKROTIK_USERNAME;


    const password =
        hasRouterCredentials
            ? router.api_password
            : process.env.MIKROTIK_PASSWORD;


    if (
        !username ||
        !password
    ) {
        throw new Error(
            'MikroTik credentials are missing'
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
    router,
    path,
    method = 'GET',
    body = null
) => {

    assertConfiguredRouter(router);


    return new Promise(
        (
            resolve,
            reject
        ) => {

            const payload =
                body
                    ? JSON.stringify(body)
                    : null;


            const port =
                Number(
                    router.api_port ||
                    router.port ||
                    DEFAULT_MIKROTIK_PORT
                );


            const options = {

                hostname:
                    String(router.host).trim(),

                port,

                path:
                    `/rest${path}`,

                method,

                headers: {

                    Authorization:
                        getAuthorizationHeader(router),

                    Accept:
                        'application/json',

                    'Content-Type':
                        'application/json'
                },


                // RouterOS currently uses a locally generated
                // certificate. Traffic between the VPS and
                // router travels through WireGuard.
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
                    response => {

                        let responseBody =
                            '';


                        response.on(
                            'data',
                            chunk => {

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
                error => {

                    reject(
                        error
                    );
                }
            );


            request.setTimeout(
                10_000,
                () => {

                    request.destroy(
                        new Error(
                            'MikroTik REST request timed out'
                        )
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

const formatDuration = durationMinutes => {

    const minutes =
        Number(
            durationMinutes
        );


    if (
        !Number.isInteger(minutes) ||
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


    if (days > 0) {

        result +=
            `${days}d`;
    }


    if (hours > 0) {

        result +=
            `${hours}h`;
    }


    if (remainingMinutes > 0) {

        result +=
            `${remainingMinutes}m`;
    }


    return result;
};


// =========================================================
// TEST CONNECTION
// =========================================================

export const testMikrotikConnection =
    async router => {

        const identity =
            await mikrotikRequest(
                router,
                '/system/identity'
            );


        console.log(
            'MikroTik connected:',
            {
                routerId:
                    router.id,

                publicId:
                    router.public_id,

                host:
                    router.host,

                identity
            }
        );


        return identity;
    };


// =========================================================
// GET ACTIVE HOTSPOT USERS
// =========================================================

export const getActiveHotspotUsers =
    async router => {

        const activeUsers =
            await mikrotikRequest(
                router,
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
    async router => {

        const users =
            await mikrotikRequest(
                router,
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
    async router => {

        const hosts =
            await mikrotikRequest(
                router,
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
        router,
        macAddress
    ) => {

        const normalizedMac =
            macAddress
                .trim()
                .toUpperCase();


        const users =
            await getHotspotUsers(
                router
            );


        const matchingUsers =
            users.filter(
                user => {

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
                router,
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
        router,
        macAddress
    ) => {

        const normalizedMac =
            macAddress
                .trim()
                .toUpperCase();


        const activeUsers =
            await getActiveHotspotUsers(
                router
            );


        const matchingActiveUsers =
            activeUsers.filter(
                activeUser => {

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
                router,
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
        router,
        macAddress
    ) => {

        const normalizedMac =
            macAddress
                .trim()
                .toUpperCase();


        const hosts =
            await getHotspotHosts(
                router
            );


        const matchingHosts =
            hosts.filter(
                host => {

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
                router,
                `/ip/hotspot/host/${encodeURIComponent(id)}`,
                'DELETE'
            );
        }
    };


// =========================================================
// FORMAT REMAINING DURATION
// =========================================================

export const formatRemainingDuration =
    seconds => {

        if (
            !Number.isSafeInteger(seconds) ||
            seconds <= 0
        ) {
            throw new Error(
                'Remaining duration must be a positive number of seconds'
            );
        }


        return `${seconds}s`;
    };


// =========================================================
// PROVISION HOTSPOT ACCESS
// =========================================================

export const provisionHotspotAccess =
    async ({
        router,
        macAddress,
        durationMinutes,
        remainingSeconds,
        getRemainingSeconds
    }) => {

        assertConfiguredRouter(
            router
        );


        if (!macAddress) {

            throw new Error(
                'Device MAC address is required'
            );
        }


        const normalizedMac =
            macAddress
                .trim()
                .toUpperCase();


        let limitUptime =
            remainingSeconds === undefined
                ? formatDuration(
                    durationMinutes
                )
                : formatRemainingDuration(
                    remainingSeconds
                );


        // Disconnect an existing session before replacing access.
        await removeExistingActiveHotspotSession(
            router,
            normalizedMac
        );


        // Remove the old HotSpot user so its uptime counter
        // does not carry into the new paid package.
        await deleteExistingHotspotUser(
            router,
            normalizedMac
        );


        if (getRemainingSeconds) {

            limitUptime =
                formatRemainingDuration(
                    await getRemainingSeconds()
                );
        }


        const newUser =
            await mikrotikRequest(
                router,
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


        // Force RouterOS to recreate the host entry and
        // perform MAC authentication using the new user.
        await removeExistingHotspotHost(
            router,
            normalizedMac
        );


        console.log(
            'MikroTik HotSpot access provisioned:',
            {
                routerId:
                    router.id,

                routerPublicId:
                    router.public_id,

                routerHost:
                    router.host,

                macAddress:
                    normalizedMac,

                durationMinutes:
                    Number(
                        durationMinutes ??
                        remainingSeconds / 60
                    ),

                limitUptime
            }
        );


        return newUser;
    };


// =========================================================
// RESTORE EXISTING SESSION
// =========================================================

export const restoreHotspotAccess =
    async ({
        router,
        macAddress,
        ipAddress,
        getRemainingSeconds
    }) => {

        assertConfiguredRouter(
            router
        );


        const mac =
            macAddress
                .trim()
                .toUpperCase();


        const hosts =
            await getHotspotHosts(
                router
            );


        const deviceExists =
            hosts.some(
                host =>
                    String(
                        host[
                            'mac-address'
                        ]
                    )
                        .toUpperCase() === mac &&
                    (
                        host.address ===
                            ipAddress ||
                        host[
                            'to-address'
                        ] ===
                            ipAddress
                    )
            );


        if (!deviceExists) {

            throw new Error(
                'Device connection could not be verified on the router'
            );
        }


        const active =
            await getActiveHotspotUsers(
                router
            );


        const remainingSeconds =
            await getRemainingSeconds();


        formatRemainingDuration(
            remainingSeconds
        );


        const connection =
            active.find(
                user =>
                    String(
                        user[
                            'mac-address'
                        ]
                    )
                        .toUpperCase() ===
                        mac &&
                    user.user ===
                        mac
            );


        // Repeated reconnect checks must not interrupt an
        // already correctly timed connection.
        const timeLeft =
            parseRouterDuration(
                connection?.[
                    'session-time-left'
                ]
            );


        if (
            timeLeft !== null &&
            timeLeft > 0 &&
            timeLeft <= remainingSeconds
        ) {

            return {
                restored:
                    false,

                remainingSeconds
            };
        }


        await provisionHotspotAccess({
            router,
            macAddress:
                mac,
            remainingSeconds,
            getRemainingSeconds
        });


        return {
            restored:
                true,

            remainingSeconds
        };
    };


// =========================================================
// PARSE ROUTEROS DURATION
// =========================================================

export const parseRouterDuration =
    value => {

        if (
            typeof value !== 'string' ||
            !value ||
            !/^(?:\d+w)?(?:\d+d)?(?:\d+h)?(?:\d+m)?(?:\d+s)?$/.test(
                value
            )
        ) {

            return null;
        }


        const units = {
            w: 604800,
            d: 86400,
            h: 3600,
            m: 60,
            s: 1
        };


        return [
            ...value.matchAll(
                /(\d+)([wdhms])/g
            )
        ].reduce(
            (
                sum,
                match
            ) =>
                sum +
                Number(
                    match[1]
                ) *
                units[
                    match[2]
                ],
            0
        );
    };
