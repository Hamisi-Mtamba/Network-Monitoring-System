// Import Angular dependency injection utilities
import {
    Injectable
} from '@angular/core';


// Import HttpClient for backend requests
import {
    HttpClient
} from '@angular/common/http';


// Import Observable type
import {
    Observable
} from 'rxjs';


// Import API configuration
import {
    API_CONFIG
} from '../config/api.config';


// Import administrator models
import {
    ChangeCompanyAdminPasswordRequest,
    CompanyAdminResponse,
    CompanyAdminsResponse,
    CreateCompanyAdminRequest,
    UpdateCompanyAdminRequest
} from '../models/admin.model';


@Injectable({
    providedIn: 'root'
})
export class AdminService {

    // Inject Angular HttpClient
    constructor(
        private readonly http: HttpClient
    ) {}


    /* =====================================================
       COMPANY ADMINISTRATOR LIST
       ===================================================== */

    /**
     * Get all normal administrators belonging to
     * one selected company.
     *
     * Backend:
     * GET /api/platform/companies/:companyId/admins
     */
    getCompanyAdmins(
        companyId: number
    ): Observable<CompanyAdminsResponse> {

        return this.http
            .get<CompanyAdminsResponse>(
                `${API_CONFIG.platformUrl}/companies/${companyId}/admins`
            );
    }


    /* =====================================================
       CREATE COMPANY ADMINISTRATOR
       ===================================================== */

    /**
     * Create a new normal administrator for
     * one selected company.
     *
     * Backend:
     * POST /api/platform/companies/:companyId/admins
     */
    createCompanyAdmin(
        companyId: number,
        payload: CreateCompanyAdminRequest
    ): Observable<CompanyAdminResponse> {

        return this.http
            .post<CompanyAdminResponse>(
                `${API_CONFIG.platformUrl}/companies/${companyId}/admins`,
                payload
            );
    }


    /* =====================================================
       UPDATE COMPANY ADMINISTRATOR
       ===================================================== */

    /**
     * Update the name or email of one company admin.
     *
     * Backend:
     * PATCH
     * /api/platform/companies/:companyId/admins/:adminId
     */
    updateCompanyAdmin(
        companyId: number,
        adminId: number,
        payload: UpdateCompanyAdminRequest
    ): Observable<CompanyAdminResponse> {

        return this.http
            .patch<CompanyAdminResponse>(
                `${API_CONFIG.platformUrl}/companies/${companyId}/admins/${adminId}`,
                payload
            );
    }


    /* =====================================================
       CHANGE ADMIN PASSWORD
       ===================================================== */

    /**
     * Change one company administrator's password.
     *
     * Backend:
     * PATCH
     * /api/platform/companies/:companyId/admins/:adminId/password
     */
    changeCompanyAdminPassword(
        companyId: number,
        adminId: number,
        payload: ChangeCompanyAdminPasswordRequest
    ): Observable<CompanyAdminResponse> {

        return this.http
            .patch<CompanyAdminResponse>(
                `${API_CONFIG.platformUrl}/companies/${companyId}/admins/${adminId}/password`,
                payload
            );
    }


    /* =====================================================
       SUSPEND COMPANY ADMINISTRATOR
       ===================================================== */

    /**
     * Suspend one company administrator.
     *
     * Backend:
     * PATCH
     * /api/platform/companies/:companyId/admins/:adminId/suspend
     */
    suspendCompanyAdmin(
        companyId: number,
        adminId: number
    ): Observable<CompanyAdminResponse> {

        return this.http
            .patch<CompanyAdminResponse>(
                `${API_CONFIG.platformUrl}/companies/${companyId}/admins/${adminId}/suspend`,
                {}
            );
    }


    /* =====================================================
       ACTIVATE COMPANY ADMINISTRATOR
       ===================================================== */

    /**
     * Reactivate one suspended company administrator.
     *
     * Backend:
     * PATCH
     * /api/platform/companies/:companyId/admins/:adminId/activate
     */
    activateCompanyAdmin(
        companyId: number,
        adminId: number
    ): Observable<CompanyAdminResponse> {

        return this.http
            .patch<CompanyAdminResponse>(
                `${API_CONFIG.platformUrl}/companies/${companyId}/admins/${adminId}/activate`,
                {}
            );
    }


    /* =====================================================
       DELETE COMPANY ADMINISTRATOR
       ===================================================== */

    /**
     * Permanently delete one company administrator.
     *
     * Backend:
     * DELETE
     * /api/platform/companies/:companyId/admins/:adminId
     */
    deleteCompanyAdmin(
        companyId: number,
        adminId: number
    ): Observable<CompanyAdminResponse> {

        return this.http
            .delete<CompanyAdminResponse>(
                `${API_CONFIG.platformUrl}/companies/${companyId}/admins/${adminId}`
            );
    }
}