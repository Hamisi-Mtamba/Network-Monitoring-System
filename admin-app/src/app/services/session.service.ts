import {
    inject,
    Injectable
} from '@angular/core';

import {
    HttpClient
} from '@angular/common/http';

import {
    Observable
} from 'rxjs';

import {
    API_CONFIG
} from '../config/api.config';

import {
    CompanySessionResponse,
    CompanySessionsResponse,
    SessionListResponse,
    SessionResponse,
    SessionStatus,
    UpdateSessionStatusRequest
} from '../models/session.model';


@Injectable({
    providedIn: 'root'
})
export class SessionService {

    private readonly http =
        inject(HttpClient);


    // =====================================================
    // NORMAL COMPANY ADMIN URL
    // =====================================================

    private readonly url =
        `${API_CONFIG.baseUrl}/sessions`;


    // =====================================================
    // NORMAL COMPANY ADMIN METHODS
    // =====================================================

    getSessions():
        Observable<SessionListResponse> {

        return this.http.get<SessionListResponse>(
            this.url
        );
    }


    getSession(
        id: number
    ): Observable<SessionResponse> {

        return this.http.get<SessionResponse>(
            `${this.url}/${id}`
        );
    }


    /**
     * This currently changes PostgreSQL state only.
     *
     * Future MikroTik/router activation or suspension
     * should be coordinated by the backend behind this
     * same API contract.
     */
    changeStatus(
        id: number,
        status: SessionStatus
    ): Observable<SessionResponse> {

        const payload:
            UpdateSessionStatusRequest = {

            status
        };


        return this.http.patch<SessionResponse>(
            `${this.url}/${id}/status`,
            payload
        );
    }


    // =====================================================
    // SUPERADMIN COMPANY SESSION METHODS
    // =====================================================

    /**
     * Get all sessions belonging to the company
     * currently selected by Superadmin.
     *
     * GET
     * /api/platform/companies/:companyId/sessions
     */
    getCompanySessions(
        companyId: number
    ): Observable<CompanySessionsResponse> {

        return this.http.get<CompanySessionsResponse>(
            `${API_CONFIG.platformUrl}/companies/${companyId}/sessions`
        );
    }


    /**
     * Get one session belonging to the selected company.
     *
     * GET
     * /api/platform/companies/:companyId/sessions/:sessionId
     */
    getCompanySession(
        companyId: number,
        sessionId: number
    ): Observable<CompanySessionResponse> {

        return this.http.get<CompanySessionResponse>(
            `${API_CONFIG.platformUrl}/companies/${companyId}/sessions/${sessionId}`
        );
    }


    /**
     * Change the status of one session belonging to
     * the company selected by Superadmin.
     *
     * PATCH
     * /api/platform/companies/:companyId/sessions/:sessionId/status
     */
    changeCompanySessionStatus(
        companyId: number,
        sessionId: number,
        status: SessionStatus
    ): Observable<CompanySessionResponse> {

        const payload:
            UpdateSessionStatusRequest = {

            status
        };


        return this.http.patch<CompanySessionResponse>(
            `${API_CONFIG.platformUrl}/companies/${companyId}/sessions/${sessionId}/status`,
            payload
        );
    }
}