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
    CompanyPackageResponse,
    CompanyPackagesResponse,
    CreateCompanyPackageRequest,
    PackageListResponse,
    PackagePayload,
    PackageResponse,
    UpdateCompanyPackageRequest,
    UpdateCompanyPackageScheduleRequest,
    UpdateCompanyPackageStatusRequest
} from '../models/package.model';


@Injectable({
    providedIn: 'root'
})
export class PackageService {

    private readonly http =
        inject(HttpClient);


    // =====================================================
    // NORMAL COMPANY ADMIN URL
    // =====================================================

    private readonly url =
        `${API_CONFIG.baseUrl}/packages`;


    // =====================================================
    // NORMAL COMPANY ADMIN PACKAGE METHODS
    // =====================================================

    getPackages():
        Observable<PackageListResponse> {

        return this.http.get<PackageListResponse>(
            this.url
        );
    }


    createPackage(
        payload: PackagePayload
    ): Observable<PackageResponse> {

        return this.http.post<PackageResponse>(
            this.url,
            payload
        );
    }


    updatePackage(
        id: number,
        payload: PackagePayload
    ): Observable<PackageResponse> {

        return this.http.patch<PackageResponse>(
            `${this.url}/${id}`,
            payload
        );
    }


    setStatus(
        id: number,
        isActive: boolean
    ): Observable<PackageResponse> {

        return this.http.patch<PackageResponse>(
            `${this.url}/${id}/status`,
            {
                is_active: isActive
            }
        );
    }


    setSchedule(
        id: number,
        availableFrom: string | null,
        availableUntil: string | null
    ): Observable<PackageResponse> {

        return this.http.patch<PackageResponse>(
            `${this.url}/${id}/schedule`,
            {
                available_from: availableFrom,
                available_until: availableUntil
            }
        );
    }


    // =====================================================
    // SUPERADMIN COMPANY PACKAGE METHODS
    // =====================================================

    /**
     * Get packages belonging to one company selected
     * by the Superadmin.
     *
     * GET /api/platform/companies/:companyId/packages
     */
    getCompanyPackages(
        companyId: number
    ): Observable<CompanyPackagesResponse> {

        return this.http.get<CompanyPackagesResponse>(
            `${API_CONFIG.platformUrl}/companies/${companyId}/packages`
        );
    }


    /**
     * Create a package for one selected company.
     *
     * POST /api/platform/companies/:companyId/packages
     */
    createCompanyPackage(
        companyId: number,
        payload: CreateCompanyPackageRequest
    ): Observable<CompanyPackageResponse> {

        return this.http.post<CompanyPackageResponse>(
            `${API_CONFIG.platformUrl}/companies/${companyId}/packages`,
            payload
        );
    }


    /**
     * Update a selected company's package.
     *
     * PATCH
     * /api/platform/companies/:companyId/packages/:packageId
     */
    updateCompanyPackage(
        companyId: number,
        packageId: number,
        payload: UpdateCompanyPackageRequest
    ): Observable<CompanyPackageResponse> {

        return this.http.patch<CompanyPackageResponse>(
            `${API_CONFIG.platformUrl}/companies/${companyId}/packages/${packageId}`,
            payload
        );
    }


    /**
     * Activate or deactivate a selected company's package.
     *
     * PATCH
     * /api/platform/companies/:companyId/packages/:packageId/status
     */
    setCompanyPackageStatus(
        companyId: number,
        packageId: number,
        isActive: boolean
    ): Observable<CompanyPackageResponse> {

        const payload:
            UpdateCompanyPackageStatusRequest = {

            is_active:
                isActive
        };


        return this.http.patch<CompanyPackageResponse>(
            `${API_CONFIG.platformUrl}/companies/${companyId}/packages/${packageId}/status`,
            payload
        );
    }


    /**
     * Update availability dates for a selected
     * company's package.
     *
     * PATCH
     * /api/platform/companies/:companyId/packages/:packageId/schedule
     */
    setCompanyPackageSchedule(
        companyId: number,
        packageId: number,
        availableFrom: string | null,
        availableUntil: string | null
    ): Observable<CompanyPackageResponse> {

        const payload:
            UpdateCompanyPackageScheduleRequest = {

            available_from:
                availableFrom,

            available_until:
                availableUntil
        };


        return this.http.patch<CompanyPackageResponse>(
            `${API_CONFIG.platformUrl}/companies/${companyId}/packages/${packageId}/schedule`,
            payload
        );
    }


    /**
     * Delete a package belonging to a selected company.
     *
     * DELETE
     * /api/platform/companies/:companyId/packages/:packageId
     */
    deleteCompanyPackage(
        companyId: number,
        packageId: number
    ): Observable<CompanyPackageResponse> {

        return this.http.delete<CompanyPackageResponse>(
            `${API_CONFIG.platformUrl}/companies/${companyId}/packages/${packageId}`
        );
    }
}