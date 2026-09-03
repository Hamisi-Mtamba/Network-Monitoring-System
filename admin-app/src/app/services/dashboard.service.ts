// Import Angular dependency injection utilities
import {
    inject,
    Injectable
} from '@angular/core';


// Import Angular HTTP client
import {
    HttpClient
} from '@angular/common/http';


// Import RxJS observable type
import {
    Observable
} from 'rxjs';


// Import API configuration
import {
    API_CONFIG
} from '../config/api.config';


// Import dashboard response models
import {
    DashboardResponse,
    PlatformDashboardResponse
} from '../models/dashboard.model';


@Injectable({
    providedIn: 'root'
})
export class DashboardService {

    // Angular HTTP client
    private readonly http =
        inject(HttpClient);


    /* =====================================================
       COMPANY ADMIN DASHBOARD
       ===================================================== */

    /**
     * Fetch dashboard statistics for the authenticated
     * company administrator.
     *
     * Backend:
     * GET /api/admin/dashboard
     */
    getDashboard():
        Observable<DashboardResponse> {

        return this.http.get<DashboardResponse>(
            `${API_CONFIG.baseUrl}/dashboard`
        );
    }


    /* =====================================================
       SUPERADMIN PLATFORM DASHBOARD
       ===================================================== */

    /**
     * Fetch platform-wide dashboard statistics.
     *
     * Available only to the Superadmin.
     *
     * Backend:
     * GET /api/platform/dashboard
     */
    getPlatformDashboard():
        Observable<PlatformDashboardResponse> {

        return this.http.get<PlatformDashboardResponse>(
            `${API_CONFIG.platformUrl}/dashboard`
        );
    }
}