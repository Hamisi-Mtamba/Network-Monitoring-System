import { isIP } from 'node:net';

export class ReconnectError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}

// Dependencies are explicit so DB behavior and router failures can be tested
// without changing a real customer's access.
// Reconnect only restores an active, unexpired session for the selected router.
export const reconnectSession = async ({ pool, restoreAccess }, { companySlug, mac, ip, router }) => {
    if (typeof companySlug !== 'string' || typeof mac !== 'string' ||
        !/^[\da-f]{2}(:[\da-f]{2}){5}$/i.test(mac) ||
        typeof ip !== 'string' || !isIP(ip) || typeof router !== 'string' || !router.trim()) {
        throw new ReconnectError(400, 'Valid company, router, device MAC and IP are required');
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const mapping = await client.query(`
            SELECT r.id, r.company_id, r.public_id, r.host
            FROM mikrotik_routers r
            JOIN companies c ON c.id = r.company_id
            WHERE c.slug = $1 AND c.status = 'active'
              AND r.public_id = $2 AND r.status = 'active'
        `, [companySlug, router]);
        if (mapping.rows.length !== 1) throw new ReconnectError(404, 'Wi-Fi provider/router not found');
        const target = mapping.rows[0];
        const identity = [target.company_id, target.id, mac.toUpperCase()];
        await client.query(`
            UPDATE internet_sessions SET status = 'expired'
            WHERE company_id = $1 AND router_id = $2 AND UPPER(device_mac) = $3
              AND status = 'active' AND expires_at <= CURRENT_TIMESTAMP
        `, identity);
        const result = await client.query(`
            SELECT id, expires_at, status FROM internet_sessions
            WHERE company_id = $1 AND router_id = $2 AND UPPER(device_mac) = $3
              AND status = 'active' AND expires_at > CURRENT_TIMESTAMP
            ORDER BY expires_at DESC, id DESC LIMIT 1 FOR UPDATE
        `, identity);
        const session = result.rows[0];
        if (!session) {
            const suspended = await client.query(`
                SELECT id FROM internet_sessions WHERE company_id = $1 AND router_id = $2
                  AND UPPER(device_mac) = $3 AND status = 'suspended' LIMIT 1
            `, identity);
            await client.query('COMMIT');
            return { state: suspended.rows.length ? 'suspended' : 'none' };
        }
        const getRemainingSeconds = async () => {
            // Existing timestamps have no timezone. Calculate in PostgreSQL's
            // configured timezone, matching payment creation, not browser time.
            const time = await client.query(`
                SELECT GREATEST(0, FLOOR(EXTRACT(EPOCH FROM
                    (expires_at - clock_timestamp()::timestamp))))::integer AS remaining_seconds
                FROM internet_sessions WHERE id = $1 AND company_id = $2 AND router_id = $3
            `, [session.id, target.company_id, target.id]);
            return time.rows[0].remaining_seconds;
        };
        if (await getRemainingSeconds() <= 0) {
            await client.query("UPDATE internet_sessions SET status = 'expired' WHERE id = $1 AND company_id = $2", [session.id, target.company_id]);
            await client.query('COMMIT');
            return { state: 'none' };
        }
        const restored = await restoreAccess({ router: target, macAddress: mac, ipAddress: ip, getRemainingSeconds });
        await client.query('COMMIT');
        return { state: 'active', session: { id: session.id, expires_at: session.expires_at }, ...restored };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally { client.release(); }
};
