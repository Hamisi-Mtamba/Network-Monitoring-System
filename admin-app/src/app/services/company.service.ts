// Import Angular dependency injection utilities
import {
    Injectable,
    signal
} from '@angular/core';


// Import HttpClient for backend requests
import {
    HttpClient
} from '@angular/common/http';


// Import Observable utilities
import {
    Observable,
    tap
} from 'rxjs';


// Import API configuration
import {
    API_CONFIG
} from '../config/api.config';


// Import company models
import {
    CompaniesResponse,
    Company,
    CompanyBrandingImageType,
    CompanyImageUploadResponse,
    CompanyResponse,
    CreateCompanyRequest,
    UpdateCompanyBrandingRequest,
    UpdateCompanyLogoRequest,
    UpdateCompanyRequest
} from '../models/company.model';


// Make this service available throughout the application
@Injectable({
    providedIn: 'root'
})
export class CompanyService {

    // =====================================================
    // LOCAL COMPANY STATE
    // =====================================================

    private readonly companySignal =
        signal<Company | null>(null);


    readonly company =
        this.companySignal.asReadonly();


    // =====================================================
    // CONSTRUCTOR
    // =====================================================

    constructor(
        private readonly http: HttpClient
    ) {}


    // =====================================================
    // COMPANY ADMIN PROFILE
    // =====================================================

    /**
     * Load authenticated company administrator's company.
     *
     * GET /api/admin/company
     */
    loadCompany():
        Observable<CompanyResponse> {

        return this.http
            .get<CompanyResponse>(
                `${API_CONFIG.baseUrl}/company`
            )
            .pipe(

                tap((response) => {

                    this.setCompany(
                        response.company
                    );
                })
            );
    }


    /**
     * Update authenticated company's profile.
     *
     * PATCH /api/admin/company
     */
    updateCurrentCompany(
        payload: UpdateCompanyRequest
    ): Observable<CompanyResponse> {

        return this.http
            .patch<CompanyResponse>(
                `${API_CONFIG.baseUrl}/company`,
                payload
            )
            .pipe(

                tap((response) => {

                    this.setCompany(
                        response.company
                    );
                })
            );
    }


    // =====================================================
    // COMPANY ADMIN LOGO
    // =====================================================

    /**
     * Update authenticated company's logo URL manually.
     *
     * PATCH /api/admin/company/logo
     */
    updateCurrentCompanyLogo(
        payload: UpdateCompanyLogoRequest
    ): Observable<CompanyResponse> {

        return this.http
            .patch<CompanyResponse>(
                `${API_CONFIG.baseUrl}/company/logo`,
                payload
            )
            .pipe(

                tap((response) => {

                    this.setCompany(
                        response.company
                    );
                })
            );
    }


    /**
     * Upload authenticated company's logo.
     *
     * POST /api/admin/company/logo/upload
     */
    uploadCurrentCompanyLogo(
        file: File
    ): Observable<CompanyImageUploadResponse> {

        const formData =
            this.createImageFormData(
                file
            );


        return this.http
            .post<CompanyImageUploadResponse>(
                `${API_CONFIG.baseUrl}/company/logo/upload`,
                formData
            )
            .pipe(

                tap((response) => {

                    if (response.company) {

                        this.setCompany(
                            response.company
                        );
                    }
                })
            );
    }


    /**
     * Remove authenticated company's logo.
     *
     * DELETE /api/admin/company/logo
     */
    removeCurrentCompanyLogo():
        Observable<CompanyResponse> {

        return this.http
            .delete<CompanyResponse>(
                `${API_CONFIG.baseUrl}/company/logo`
            )
            .pipe(

                tap((response) => {

                    this.setCompany(
                        response.company
                    );
                })
            );
    }


    // =====================================================
    // COMPANY ADMIN BRANDING
    // =====================================================

    /**
     * Update authenticated company's branding.
     *
     * PATCH /api/admin/company/branding
     */
    updateCurrentCompanyBranding(
        payload: UpdateCompanyBrandingRequest
    ): Observable<CompanyResponse> {

        return this.http
            .patch<CompanyResponse>(
                `${API_CONFIG.baseUrl}/company/branding`,
                payload
            )
            .pipe(

                tap((response) => {

                    this.setCompany(
                        response.company
                    );
                })
            );
    }


    /**
     * Upload authenticated company's branding image.
     *
     * POST /api/admin/company/branding/:imageType/upload
     */
    uploadCurrentCompanyBrandingImage(
        imageType:
            CompanyBrandingImageType,
        file: File
    ): Observable<CompanyImageUploadResponse> {

        const formData =
            this.createImageFormData(
                file
            );


        return this.http
            .post<CompanyImageUploadResponse>(
                `${API_CONFIG.baseUrl}/company/branding/${imageType}/upload`,
                formData
            )
            .pipe(

                tap((response) => {

                    if (response.company) {

                        this.setCompany(
                            response.company
                        );
                    }
                })
            );
    }


    /**
     * Remove one authenticated company branding image.
     *
     * DELETE /api/admin/company/branding/:imageType
     */
    removeCurrentCompanyBrandingImage(
        imageType:
            CompanyBrandingImageType
    ): Observable<CompanyResponse> {

        return this.http
            .delete<CompanyResponse>(
                `${API_CONFIG.baseUrl}/company/branding/${imageType}`
            )
            .pipe(

                tap((response) => {

                    this.setCompany(
                        response.company
                    );
                })
            );
    }


    // =====================================================
    // SUPERADMIN COMPANY LIST
    // =====================================================

    /**
     * Get every company.
     *
     * GET /api/platform/companies
     */
    getCompanies():
        Observable<CompaniesResponse> {

        return this.http
            .get<CompaniesResponse>(
                `${API_CONFIG.platformUrl}/companies`
            );
    }


    // =====================================================
    // SUPERADMIN SINGLE COMPANY
    // =====================================================

    /**
     * Get one company by ID.
     *
     * GET /api/platform/companies/:companyId
     */
    getCompanyById(
        companyId: number
    ): Observable<CompanyResponse> {

        return this.http
            .get<CompanyResponse>(
                `${API_CONFIG.platformUrl}/companies/${companyId}`
            );
    }


    /**
     * Get selected company's shared profile.
     *
     * GET /api/platform/companies/:companyId/profile
     */
    getCompanyProfile(
        companyId: number
    ): Observable<CompanyResponse> {

        return this.http
            .get<CompanyResponse>(
                `${API_CONFIG.platformUrl}/companies/${companyId}/profile`
            );
    }


    // =====================================================
    // SUPERADMIN CREATE COMPANY
    // =====================================================

    /**
     * Create a tenant company.
     *
     * POST /api/platform/companies
     */
    createCompany(
        payload: CreateCompanyRequest
    ): Observable<CompanyResponse> {

        return this.http
            .post<CompanyResponse>(
                `${API_CONFIG.platformUrl}/companies`,
                payload
            );
    }


    // =====================================================
    // SUPERADMIN UPDATE COMPANY
    // =====================================================

    /**
     * Update basic company information.
     *
     * PATCH /api/platform/companies/:companyId
     */
    updateCompany(
        companyId: number,
        payload: UpdateCompanyRequest
    ): Observable<CompanyResponse> {

        return this.http
            .patch<CompanyResponse>(
                `${API_CONFIG.platformUrl}/companies/${companyId}`,
                payload
            );
    }


    /**
     * Update selected company's shared profile.
     *
     * PATCH /api/platform/companies/:companyId/profile
     */
    updateCompanyProfile(
        companyId: number,
        payload: UpdateCompanyRequest
    ): Observable<CompanyResponse> {

        return this.http
            .patch<CompanyResponse>(
                `${API_CONFIG.platformUrl}/companies/${companyId}/profile`,
                payload
            );
    }


    // =====================================================
    // SUPERADMIN COMPANY STATUS
    // =====================================================

    /**
     * Suspend selected company.
     *
     * PATCH /api/platform/companies/:companyId/suspend
     */
    suspendCompany(
        companyId: number
    ): Observable<CompanyResponse> {

        return this.http
            .patch<CompanyResponse>(
                `${API_CONFIG.platformUrl}/companies/${companyId}/suspend`,
                {}
            );
    }


    /**
     * Reactivate selected company.
     *
     * PATCH /api/platform/companies/:companyId/activate
     */
    activateCompany(
        companyId: number
    ): Observable<CompanyResponse> {

        return this.http
            .patch<CompanyResponse>(
                `${API_CONFIG.platformUrl}/companies/${companyId}/activate`,
                {}
            );
    }


    // =====================================================
    // SUPERADMIN COMPANY LOGO
    // =====================================================

    /**
     * Update selected company's logo URL manually.
     *
     * PATCH /api/platform/companies/:companyId/profile/logo
     */
    updateCompanyLogo(
        companyId: number,
        payload: UpdateCompanyLogoRequest
    ): Observable<CompanyResponse> {

        return this.http
            .patch<CompanyResponse>(
                `${API_CONFIG.platformUrl}/companies/${companyId}/profile/logo`,
                payload
            );
    }


    /**
     * Upload selected company's logo.
     *
     * POST
     * /api/platform/companies/:companyId/profile/logo/upload
     */
    uploadCompanyLogo(
        companyId: number,
        file: File
    ): Observable<CompanyImageUploadResponse> {

        const formData =
            this.createImageFormData(
                file
            );


        return this.http
            .post<CompanyImageUploadResponse>(
                `${API_CONFIG.platformUrl}/companies/${companyId}/profile/logo/upload`,
                formData
            );
    }


    /**
     * Remove selected company's logo.
     *
     * DELETE
     * /api/platform/companies/:companyId/profile/logo
     */
    removeCompanyLogo(
        companyId: number
    ): Observable<CompanyResponse> {

        return this.http
            .delete<CompanyResponse>(
                `${API_CONFIG.platformUrl}/companies/${companyId}/profile/logo`
            );
    }


    // =====================================================
    // SUPERADMIN COMPANY BRANDING
    // =====================================================

    /**
     * Update branding using platform-specific endpoint.
     *
     * PATCH /api/platform/companies/:companyId/branding
     */
    updateCompanyBranding(
        companyId: number,
        payload: UpdateCompanyBrandingRequest
    ): Observable<CompanyResponse> {

        return this.http
            .patch<CompanyResponse>(
                `${API_CONFIG.platformUrl}/companies/${companyId}/branding`,
                payload
            );
    }


    /**
     * Update branding through shared company profile endpoint.
     *
     * PATCH
     * /api/platform/companies/:companyId/profile/branding
     */
    updateCompanyProfileBranding(
        companyId: number,
        payload: UpdateCompanyBrandingRequest
    ): Observable<CompanyResponse> {

        return this.http
            .patch<CompanyResponse>(
                `${API_CONFIG.platformUrl}/companies/${companyId}/profile/branding`,
                payload
            );
    }


    /**
     * Upload selected company's branding image.
     *
     * POST
     * /api/platform/companies/:companyId/profile/branding/:imageType/upload
     */
    uploadCompanyBrandingImage(
        companyId: number,
        imageType:
            CompanyBrandingImageType,
        file: File
    ): Observable<CompanyImageUploadResponse> {

        const formData =
            this.createImageFormData(
                file
            );


        return this.http
            .post<CompanyImageUploadResponse>(
                `${API_CONFIG.platformUrl}/companies/${companyId}/profile/branding/${imageType}/upload`,
                formData
            );
    }


    /**
     * Remove selected company's branding image.
     *
     * DELETE
     * /api/platform/companies/:companyId/profile/branding/:imageType
     */
    removeCompanyBrandingImage(
        companyId: number,
        imageType:
            CompanyBrandingImageType
    ): Observable<CompanyResponse> {

        return this.http
            .delete<CompanyResponse>(
                `${API_CONFIG.platformUrl}/companies/${companyId}/profile/branding/${imageType}`
            );
    }


    // =====================================================
    // LOCAL COMPANY STATE
    // =====================================================

    /**
     * Store company in application state.
     */
    setCompany(
        company: Company
    ): void {

        this.companySignal.set(
            company
        );


        this.applyBranding(
            company
        );
    }


    /**
     * Clear stored tenant company.
     */
    clearCompany(): void {

        this.companySignal.set(
            null
        );


        this.clearBranding();
    }


    // =====================================================
    // BRANDING CSS VARIABLES
    // =====================================================

    /**
     * Apply company branding variables.
     */
    private applyBranding(
        company: Company
    ): void {

        const branding =
            company.settings?.branding;


        const root =
            document.documentElement;


        root.style.setProperty(
            '--company-primary',
            branding?.primary_color ||
            '#2563EB'
        );


        root.style.setProperty(
            '--company-secondary',
            branding?.secondary_color ||
            '#111827'
        );


        root.style.setProperty(
            '--company-accent',
            branding?.accent_color ||
            '#22C55E'
        );


        root.style.setProperty(
            '--company-background',
            branding?.background_color ||
            '#F8FAFC'
        );


        root.style.setProperty(
            '--company-navbar',
            branding?.navbar_color ||
            '#FFFFFF'
        );
    }


    /**
     * Remove company branding variables.
     */
    private clearBranding(): void {

        const root =
            document.documentElement;


        root.style.removeProperty(
            '--company-primary'
        );


        root.style.removeProperty(
            '--company-secondary'
        );


        root.style.removeProperty(
            '--company-accent'
        );


        root.style.removeProperty(
            '--company-background'
        );


        root.style.removeProperty(
            '--company-navbar'
        );
    }


    // =====================================================
    // IMAGE UPLOAD HELPER
    // =====================================================

    /**
     * Build multipart form data.
     */
    private createImageFormData(
        file: File
    ): FormData {

        const formData =
            new FormData();


        formData.append(
            'image',
            file
        );


        return formData;
    }
}