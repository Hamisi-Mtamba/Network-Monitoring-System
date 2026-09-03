// Import Angular component utilities
import {
    Component,
    OnInit,
    inject
} from '@angular/core';


// Import Angular common utilities
import {
    DatePipe
} from '@angular/common';


// Import Angular routing utilities
import {
    ActivatedRoute,
    RouterLink
} from '@angular/router';


// Import tenant/company service
import {
    TenantService
} from '../../services/tenant.service';


@Component({
    selector: 'app-expired-page',

    standalone: true,

    imports: [
        RouterLink
    ],

    templateUrl: './expired.html',

    styleUrl: './expired.css'
})
export class ExpiredPageComponent
    implements OnInit {

    // Access current route parameters
    private readonly route =
        inject(ActivatedRoute);


    // Access current company/tenant state
    readonly tenantService =
        inject(TenantService);


    // Restore tenant context when page opens
    ngOnInit(): void {

        // Read company slug from:
        // /:companySlug/expired
        const companySlug =
            this.route.snapshot.paramMap.get(
                'companySlug'
            );


        // Stop if tenant cannot be identified
        if (!companySlug) {
            return;
        }


        // Store tenant immediately
        this.tenantService.setCompanySlug(
            companySlug
        );


        // Reload company profile and branding
        // so this page also works after browser refresh
        this.tenantService
            .loadCompany(companySlug)
            .subscribe({

                // Nothing else is required when successful
                next: () => {},


                // Keep the page usable even if company
                // information cannot currently be refreshed
                error: (error) => {

                    console.error(
                        'Failed to load company on expired page:',
                        error
                    );
                }
            });
    }
}