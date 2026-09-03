/* =========================================================
   BACKEND API CONFIGURATION
   =========================================================
 *
 * Change the backendUrl once when the Express API moves
 * from local development to staging or production.
 *
 * All other API URLs are derived from it.
 * ========================================================= */

export const API_CONFIG = {

    // Express backend root
    backendUrl:
        'http://localhost:4000',


    // Normal company administrator API
    baseUrl:
        'http://localhost:4000/api/admin',


    // Superadmin platform API
    platformUrl:
        'http://localhost:4000/api/platform'

} as const;