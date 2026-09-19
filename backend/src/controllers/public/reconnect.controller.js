import { pool } from '../../database/database.js';
import { restoreHotspotAccess } from '../../../services/mikrotik.service.js';
import { reconnectSession, ReconnectError } from '../../../services/session-reconnect.service.js';

export const reconnect = async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try {
        const result = await reconnectSession({ pool, restoreAccess: restoreHotspotAccess }, {
            companySlug: req.params.companySlug,
            mac: req.body?.mac, ip: req.body?.ip, router: req.body?.router
        });
        res.json({ success: true, ...result });
    } catch (error) {
        if (!(error instanceof ReconnectError)) console.error('Reconnect failed:', error.message);
        res.status(error instanceof ReconnectError ? error.status : 503).json({
            success: false,
            message: error instanceof ReconnectError ? error.message : 'Existing access could not be checked. Please retry before purchasing.'
        });
    }
};
