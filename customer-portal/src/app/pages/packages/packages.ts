// Import Angular component utilities
import {
    Component,
    OnInit,
    inject,
    signal
} from '@angular/core';


// Import Angular routing utilities
import {
    ActivatedRoute,
    Router
} from '@angular/router';


// Import reusable loading component
import {
    LoadingSpinnerComponent
} from '../../components/loading-spinner/loading-spinner';


// Import package card component
import {
    PackageCardComponent
} from '../../components/package-card/package-card';


// Import package model
import {
    InternetPackage
} from '../../models/package.model';


// Import package service
import {
    PackageService
} from '../../services/package.service';


// Import tenant/company service
import {
    TenantService
} from '../../services/tenant.service';


@Component({
    selector: 'app-packages-page',

    standalone: true,

    imports: [
        LoadingSpinnerComponent,
        PackageCardComponent
    ],

    templateUrl: './packages.html',

    styleUrl: './packages.css'
})
export class PackagesPageComponent
    implements OnInit {

    // Packages displayed on this page
    readonly packages =
        signal<InternetPackage[]>([]);


    // Loading state
    readonly loading =
        signal(true);


    // Error message shown in the UI
    readonly errorMessage =
        signal('');


    // Access current route parameters
    private readonly route =
        inject(ActivatedRoute);


    // Access Angular router
    private readonly router =
        inject(Router);


    // Access package API/state
    readonly packageService =
        inject(PackageService);


    // Access current company/tenant state
    readonly tenantService =
        inject(TenantService);


    // Load company and packages when page opens
    ngOnInit(): void {

        // Read company slug from URL
        const companySlug =
            this.route.snapshot.paramMap.get(
                'companySlug'
            );


        // Stop when the URL does not contain a company
        if (!companySlug) {

            this.loading.set(false);

            this.errorMessage.set(
                'Company was not specified.'
            );

            return;
        }


        // Load the company first
        this.tenantService
            .loadCompany(companySlug)
            .subscribe({

                next: () => {

                    // Company exists, so load its packages
                    this.loadPackages(
                        companySlug
                    );
                },


                error: () => {

                    this.loading.set(false);

                    this.errorMessage.set(
                        'This Wi-Fi provider is unavailable.'
                    );
                }
            });
    }


    // Load packages belonging to one company
    private loadPackages(
        companySlug: string
    ): void {

        // Start loading state
        this.loading.set(true);

        // Clear any old error
        this.errorMessage.set('');


        // Request packages from tenant-specific backend endpoint
        this.packageService
            .getPackages(companySlug)
            .subscribe({

                next: (packages) => {

                    // Store returned packages
                    this.packages.set(
                        packages
                    );

                    // Finish loading
                    this.loading.set(false);
                },


                error: (error) => {

                    // Log actual development error
                    console.error(
                        'Failed to load packages:',
                        error
                    );

                    // Finish loading
                    this.loading.set(false);

                    // Show customer-friendly error
                    this.errorMessage.set(
                        'Unable to load internet packages.'
                    );
                }
            });
    }


    // Customer selects one internet package
    choosePackage(
        packageItem: InternetPackage
    ): void {

        // Save selected package for checkout
        this.packageService
            .selectPackage(
                packageItem
            );


        // Get current company slug
        const companySlug =
            this.tenantService.companySlug();


        // Stop when company context is unavailable
        if (!companySlug) {

            this.errorMessage.set(
                'Company information is unavailable.'
            );

            return;
        }


        // Continue to the payment page while preserving tenant context
        void this.router.navigate(
            ['/', companySlug, 'payment', packageItem.id],
            { queryParamsHandling: 'preserve' });
    }
}