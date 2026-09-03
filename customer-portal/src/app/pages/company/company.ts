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
    RouterLink
} from '@angular/router';


// Import API helper for uploaded company files
import {
    getPublicFileUrl
} from '../../config/api.config';


// Import company model
import {
    Company
} from '../../models/company.model';


// Import tenant/company service
import {
    TenantService
} from '../../services/tenant.service';


@Component({
    selector: 'app-company-page',

    standalone: true,

    imports: [
        RouterLink
    ],

    templateUrl: './company.html',

    styleUrl: './company.css'
})
export class CompanyPageComponent
    implements OnInit {

    // Company displayed on this page
    readonly company =
        signal<Company | null>(null);


    // Page loading state
    readonly loading =
        signal(true);


    // Customer-friendly error message
    readonly errorMessage =
        signal('');


    // Access current route parameters
    private readonly route =
        inject(ActivatedRoute);


    // Access current tenant state
    readonly tenantService =
        inject(TenantService);


    // Expose file URL helper to template
    readonly getPublicFileUrl =
        getPublicFileUrl;


    // Resolve company when page opens
    ngOnInit(): void {

        // Read company slug from:
        // /:companySlug/company
        const companySlug =
            this.route.snapshot.paramMap.get(
                'companySlug'
            );


        // Stop invalid routes
        if (!companySlug) {

            this.errorMessage.set(
                'The Wi-Fi provider could not be identified.'
            );

            this.loading.set(false);

            return;
        }


        // Store tenant immediately
        this.tenantService.setCompanySlug(
            companySlug
        );


        // First check whether the company
        // is already available in TenantService
        const existingCompany =
            this.tenantService.company();


        if (
            existingCompany &&
            existingCompany.slug === companySlug
        ) {

            this.company.set(
                existingCompany
            );

            this.loading.set(false);

            return;
        }


        // Otherwise load company profile from backend
        this.tenantService
            .loadCompany(companySlug)
            .subscribe({

                next: (response) => {

                    this.company.set(
                        response.company
                    );

                    this.loading.set(false);
                },


                error: (error) => {

                    console.error(
                        'Failed to load company profile:',
                        error
                    );


                    this.errorMessage.set(
                        'Company information could not be loaded right now.'
                    );


                    this.loading.set(false);
                }
            });
    }
}