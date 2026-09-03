import 'dotenv/config';

import {
    provisionHotspotAccess
} from './services/mikrotik.service.js';


await provisionHotspotAccess({
    macAddress:
        'BA:37:45:61:1A:54',

    durationMinutes:
        5
});