// Import Angular utilities
import {
    Injectable,
    signal
} from '@angular/core';

// Import HttpClient
import {
    HttpClient
} from '@angular/common/http';

// Import RxJS
import {
    Observable,
    tap
} from 'rxjs';

// Import company model
import {
    Company,
    CompanyResponse
} from '../models/company.model';

// Import API helper
import {
    getCompanyPublicApiUrl
} from '../config/api.config';


@Injectable({
    providedIn: 'root'
})
export class TenantService {

    // Current company slug
    private readonly slugState =
        signal<string | null>(null);

    // Current company profile
    private readonly companyState =
        signal<Company | null>(null);


    // Expose read-only state
    readonly companySlug =
        this.slugState.asReadonly();

    readonly company =
        this.companyState.asReadonly();


    constructor(
        private readonly http: HttpClient
    ) {}


    // Set the company currently being viewed
    setCompanySlug(
        slug: string
    ): void {

        const normalizedSlug =
            slug
                .trim()
                .toLowerCase();

        this.slugState.set(
            normalizedSlug
        );
    }


    // Load public company information
    loadCompany(
        slug: string
    ): Observable<CompanyResponse> {

        // Save current slug
        this.setCompanySlug(slug);

        return this.http
            .get<CompanyResponse>(
                getCompanyPublicApiUrl(slug)
            )
            .pipe(
                tap((response) => {

                    // Save company
                    this.companyState.set(
                        response.company
                    );

                    // Apply company theme
                    this.applyBranding(
                        response.company
                    );
                })
            );
    }


    // Return current slug or throw a clear error
    requireSlug(): string {

        const slug =
            this.slugState();

        if (!slug) {
            throw new Error(
                'Company tenant has not been resolved'
            );
        }

        return slug;
    }


    // Apply company CSS variables
    private applyBranding(
        company: Company
    ): void {

        const branding =
            company.settings?.branding;

        const root =
            document.documentElement;

        root.style.setProperty(
            '--company-primary',
            branding?.primary_color || '#2563EB'
        );

        root.style.setProperty(
            '--company-secondary',
            branding?.secondary_color || '#0F172A'
        );

        root.style.setProperty(
            '--company-accent',
            branding?.accent_color || '#22C55E'
        );

        root.style.setProperty(
            '--company-background',
            branding?.background_color || '#F8FAFC'
        );

        root.style.setProperty(
            '--company-navbar',
            branding?.navbar_color || '#FFFFFF'
        );
    }
}