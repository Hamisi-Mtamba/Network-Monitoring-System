// Import Angular HTTP client
import {
    HttpClient
} from '@angular/common/http';


// Import Angular dependency injection and signals
import {
    Injectable,
    signal
} from '@angular/core';


// Import RxJS utilities
import {
    catchError,
    map,
    Observable,
    of,
    tap,
    throwError
} from 'rxjs';


// Import tenant-aware public API builder
import {
    getCompanyPublicApiUrl
} from '../config/api.config';


// Import package demo fallback data
import {
    MOCK_PACKAGES
} from '../mocks/package.mock';


// Import package models
import {
    InternetPackage,
    PackageAccent,
    PackageApiResponse
} from '../models/package.model';


// Keep fallback disabled for the real connected project.
// If the backend fails, we want to see the real error instead of hiding it with demo data.
const USE_PACKAGE_FALLBACK = false;


// Make this service available throughout the customer portal
@Injectable({
    providedIn: 'root'
})
export class PackageService {

    // Store the package selected by the customer
    private readonly selectedPackageState =
        signal<InternetPackage | null>(
            this.restoreSelection()
        );


    // Accent styles used by package cards when backend data has no accent
    private readonly accents: PackageAccent[] = [
        'blue',
        'green',
        'purple',
        'orange'
    ];


    // Expose selected package as read-only state
    readonly selectedPackage =
        this.selectedPackageState.asReadonly();


    // Shows whether demo package data is currently being used
    readonly usingMockData =
        signal(false);


    // Inject Angular HttpClient
    constructor(
        private readonly http: HttpClient
    ) {}


    // Load active packages for one company
    getPackages(
        companySlug: string
    ): Observable<InternetPackage[]> {

        // Build the tenant-specific endpoint
        const url =
            `${getCompanyPublicApiUrl(companySlug)}/packages`;

        return this.http
            .get<PackageApiResponse>(url)
            .pipe(

                // Extract the actual package array from backend response
                map(
                    (response) =>
                        this.extractPackages(response)
                ),

                // Normalize package values for the UI
                map(
                    (packages) =>
                        packages
                            .filter(
                                (item) =>
                                    item.is_active !== false
                            )
                            .map(
                                (item, index) => ({
                                    ...item,

                                    // PostgreSQL numeric values may arrive as strings
                                    price:
                                        Number(item.price),

                                    duration_minutes:
                                        Number(
                                            item.duration_minutes
                                        ),

                                    // Keep backend speed value
                                    speed:
                                        item.speed ||
                                        'Not specified',

                                    // Use existing accent or assign one
                                    accent:
                                        item.accent ||
                                        this.accents[
                                            index %
                                            this.accents.length
                                        ]
                                })
                            )
                ),

                // Confirm real backend data is being used
                tap(() => {
                    this.usingMockData.set(false);
                }),

                // Do not silently hide backend/API problems
                catchError(
                    (error: unknown) => {

                        // Keep optional fallback support available
                        if (!USE_PACKAGE_FALLBACK) {
                            return throwError(
                                () => error
                            );
                        }

                        // Use demo packages only when explicitly enabled
                        this.usingMockData.set(true);

                        return of(
                            MOCK_PACKAGES.map(
                                (item) => ({
                                    ...item
                                })
                            )
                        );
                    }
                )
            );
    }


    // Get one package by ID for one company
    getPackageById(
        companySlug: string,
        id: number
    ): Observable<InternetPackage | undefined> {

        // First use the currently selected package when it matches
        const selected =
            this.selectedPackageState();

        if (
            selected?.id === id
        ) {
            return of(selected);
        }

        // Otherwise load packages from the correct company
        return this
            .getPackages(companySlug)
            .pipe(
                map(
                    (packages) =>
                        packages.find(
                            (item) =>
                                item.id === id
                        )
                )
            );
    }


    // Remember the customer's selected package
    selectPackage(
        packageItem: InternetPackage
    ): void {

        // Save in Angular state
        this.selectedPackageState.set(
            packageItem
        );

        // Preserve selection during navigation/browser refresh
        sessionStorage.setItem(
            'y4c-selected-package',
            JSON.stringify(packageItem)
        );
    }


    // Format package duration into human-readable text
    formatDuration(
        minutes: number
    ): string {

        // Less than one hour
        if (minutes < 60) {
            return `${minutes} Minutes`;
        }

        // Full weeks
        if (
            minutes % 10_080 === 0
        ) {
            const weeks =
                minutes / 10_080;

            return `${weeks} ${
                weeks === 1
                    ? 'Week'
                    : 'Weeks'
            }`;
        }

        // Full days
        if (
            minutes % 1_440 === 0
        ) {
            const days =
                minutes / 1_440;

            return `${days} ${
                days === 1
                    ? 'Day'
                    : 'Days'
            }`;
        }

        // Full hours
        if (
            minutes % 60 === 0
        ) {
            const hours =
                minutes / 60;

            return `${hours} ${
                hours === 1
                    ? 'Hour'
                    : 'Hours'
            }`;
        }

        // Fallback
        return `${minutes} Minutes`;
    }


    // Extract package array from supported backend response shapes
    private extractPackages(
        response: PackageApiResponse
    ): InternetPackage[] {

        // Backend returned an array directly
        if (
            Array.isArray(response)
        ) {
            return response;
        }

        // Backend returned { packages: [...] }
        if (
            'packages' in response
        ) {
            return response.packages;
        }

        // Fallback response shape
        return response.data;
    }


    // Restore package selected before a browser refresh
    private restoreSelection():
        InternetPackage | null {

        try {
            // Read saved selection
            const stored =
                sessionStorage.getItem(
                    'y4c-selected-package'
                );

            // Parse selection when available
            return stored
                ? JSON.parse(
                    stored
                ) as InternetPackage
                : null;

        } catch {

            // Ignore corrupted browser storage
            return null;
        }
    }
}