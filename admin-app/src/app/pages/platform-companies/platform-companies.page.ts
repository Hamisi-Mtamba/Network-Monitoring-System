// Import Angular component utilities
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    signal
} from '@angular/core';


// Import Angular common utilities
import {
    DatePipe
} from '@angular/common';


// Import Angular forms
import {
    FormBuilder,
    ReactiveFormsModule,
    Validators
} from '@angular/forms';


// Import Angular router utilities
import {
    RouterLink
} from '@angular/router';


// Import Ionic standalone components
import {
    IonButton,
    IonIcon,
    IonInput,
    IonSpinner
} from '@ionic/angular/standalone';


// Import Ionic icon registration
import {
    addIcons
} from 'ionicons';


// Import icons used by the company management page
import {
    addOutline,
    businessOutline,
    checkmarkCircleOutline,
    closeCircleOutline,
    createOutline,
    refreshOutline,
    searchOutline
} from 'ionicons/icons';


// Import RxJS helpers
import {
    finalize
} from 'rxjs';


// Import company models
import {
    Company,
    CreateCompanyRequest
} from '../../models/company.model';


// Import company service
import {
    CompanyService
} from '../../services/company.service';


// Import shared UI service
import {
    UiService
} from '../../services/ui.service';


@Component({
    selector: 'app-platform-companies',

    standalone: true,

    imports: [
        DatePipe,
        ReactiveFormsModule,
        RouterLink,
        IonButton,
        IonIcon,
        IonInput,
        IonSpinner
    ],

    templateUrl:
        './platform-companies.page.html',

    styleUrl:
        './platform-companies.page.scss',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})
export class PlatformCompaniesPage {

    // =====================================================
    // SERVICES
    // =====================================================

    private readonly companyService =
        inject(CompanyService);

    private readonly ui =
        inject(UiService);

    private readonly fb =
        inject(FormBuilder);


    // =====================================================
    // PAGE STATE
    // =====================================================

    readonly loading =
        signal(true);

    readonly saving =
        signal(false);

    readonly actionCompanyId =
        signal<number | null>(null);

    readonly error =
        signal(false);

    readonly errorMessage =
        signal('');

    readonly companies =
        signal<Company[]>([]);

    readonly searchTerm =
        signal('');

    readonly showCreateForm =
        signal(false);


    // =====================================================
    // CREATE COMPANY FORM
    // =====================================================

    readonly createForm =
        this.fb.nonNullable.group({

            name: [
                '',
                [
                    Validators.required,
                    Validators.minLength(2),
                    Validators.maxLength(200)
                ]
            ],

            slug: [
                '',
                [
                    Validators.required,
                    Validators.pattern(
                        /^[a-z0-9-]+$/
                    )
                ]
            ],

            email: [
                '',
                [
                    Validators.email
                ]
            ],

            phone: [
                ''
            ],

            address: [
                ''
            ]
        });


    // =====================================================
    // FILTERED COMPANIES
    // =====================================================

    readonly filteredCompanies =
        computed(() => {

            const term =
                this.searchTerm()
                    .trim()
                    .toLowerCase();


            if (!term) {
                return this.companies();
            }


            return this.companies().filter(
                (company) => {

                    return (
                        company.name
                            .toLowerCase()
                            .includes(term) ||

                        company.slug
                            .toLowerCase()
                            .includes(term) ||

                        company.email
                            ?.toLowerCase()
                            .includes(term) ||

                        company.phone
                            ?.toLowerCase()
                            .includes(term)
                    );
                }
            );
        });


    // =====================================================
    // PAGE TOTALS
    // =====================================================

    readonly activeCount =
        computed(() => {

            return this.companies()
                .filter(
                    (company) =>
                        company.status ===
                        'active'
                )
                .length;
        });


    readonly suspendedCount =
        computed(() => {

            return this.companies()
                .filter(
                    (company) =>
                        company.status ===
                        'suspended'
                )
                .length;
        });


    readonly totalAdmins =
        computed(() => {

            return this.companies()
                .reduce(
                    (
                        total,
                        company
                    ) =>
                        total +
                        Number(
                            company.admin_count ?? 0
                        ),
                    0
                );
        });


    // =====================================================
    // CONSTRUCTOR
    // =====================================================

    constructor() {

        addIcons({
            addOutline,
            businessOutline,
            checkmarkCircleOutline,
            closeCircleOutline,
            createOutline,
            refreshOutline,
            searchOutline
        });


        this.loadCompanies();
    }


    // =====================================================
    // LOAD COMPANIES
    // =====================================================

    loadCompanies(): void {

        this.loading.set(true);

        this.error.set(false);

        this.errorMessage.set('');


        this.companyService
            .getCompanies()
            .pipe(
                finalize(
                    () =>
                        this.loading.set(false)
                )
            )
            .subscribe({

                next: (response) => {

                    this.companies.set(
                        response.companies
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to load companies:',
                        error
                    );


                    this.error.set(true);

                    this.errorMessage.set(
                        'Companies could not be loaded. Please check the API connection and try again.'
                    );
                }
            });
    }


    // =====================================================
    // SEARCH
    // =====================================================

    updateSearch(
        value:
            string |
            null |
            undefined
    ): void {

        this.searchTerm.set(
            value ?? ''
        );
    }


    // =====================================================
    // CREATE FORM
    // =====================================================

    openCreateForm(): void {

        this.errorMessage.set('');

        this.createForm.reset({
            name: '',
            slug: '',
            email: '',
            phone: '',
            address: ''
        });

        this.showCreateForm.set(true);
    }


    closeCreateForm(): void {

        if (this.saving()) {
            return;
        }

        this.showCreateForm.set(false);

        this.errorMessage.set('');
    }


    // =====================================================
    // CREATE COMPANY
    // =====================================================

    createCompany(): void {

        this.errorMessage.set('');


        if (this.createForm.invalid) {

            this.createForm.markAllAsTouched();

            return;
        }


        const raw =
            this.createForm.getRawValue();


        const payload:
            CreateCompanyRequest = {

            name:
                raw.name.trim(),

            slug:
                raw.slug
                    .trim()
                    .toLowerCase(),

            email:
                raw.email.trim() ||
                null,

            phone:
                raw.phone.trim() ||
                null,

            address:
                raw.address.trim() ||
                null
        };


        this.saving.set(true);


        this.companyService
            .createCompany(payload)
            .pipe(
                finalize(
                    () =>
                        this.saving.set(false)
                )
            )
            .subscribe({

                next: (response) => {

                    // Add new company to the top
                    // without requiring another request.
                    this.companies.update(
                        (companies) => [

                            {
                                ...response.company,

                                admin_count: 0,

                                package_count: 0,

                                payment_count: 0
                            },

                            ...companies
                        ]
                    );


                    this.showCreateForm.set(
                        false
                    );


                    this.createForm.reset({
                        name: '',
                        slug: '',
                        email: '',
                        phone: '',
                        address: ''
                    });
                },


                error: (error) => {

                    console.error(
                        'Failed to create company:',
                        error
                    );


                    this.errorMessage.set(
                        error?.error?.message ||
                        'The company could not be created.'
                    );
                }
            });
    }


    // =====================================================
    // SUSPEND COMPANY
    // =====================================================

    async suspendCompany(
        company: Company
    ): Promise<void> {

        const confirmed =
            await this.ui.confirm(
                'Suspend company?',
                `${company.name} will no longer be treated as an active tenant until it is reactivated.`,
                'Suspend'
            );


        if (!confirmed) {
            return;
        }


        this.actionCompanyId.set(
            company.id
        );


        this.companyService
            .suspendCompany(
                company.id
            )
            .pipe(
                finalize(
                    () =>
                        this.actionCompanyId.set(
                            null
                        )
                )
            )
            .subscribe({

                next: (response) => {

                    this.replaceCompany(
                        response.company
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to suspend company:',
                        error
                    );


                    this.errorMessage.set(
                        error?.error?.message ||
                        'The company could not be suspended.'
                    );
                }
            });
    }


    // =====================================================
    // ACTIVATE COMPANY
    // =====================================================

    async activateCompany(
        company: Company
    ): Promise<void> {

        const confirmed =
            await this.ui.confirm(
                'Activate company?',
                `${company.name} will be restored as an active tenant.`,
                'Activate'
            );


        if (!confirmed) {
            return;
        }


        this.actionCompanyId.set(
            company.id
        );


        this.companyService
            .activateCompany(
                company.id
            )
            .pipe(
                finalize(
                    () =>
                        this.actionCompanyId.set(
                            null
                        )
                )
            )
            .subscribe({

                next: (response) => {

                    this.replaceCompany(
                        response.company
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to activate company:',
                        error
                    );


                    this.errorMessage.set(
                        error?.error?.message ||
                        'The company could not be activated.'
                    );
                }
            });
    }


    // =====================================================
    // STATUS HELPERS
    // =====================================================

    statusLabel(
        company: Company
    ): string {

        if (
            company.status ===
            'active'
        ) {
            return 'Active';
        }


        if (
            company.status ===
            'suspended'
        ) {
            return 'Suspended';
        }


        return company.status;
    }


    statusClass(
        company: Company
    ): string {

        return company.status ===
            'active'
                ? 'status--active'
                : 'status--suspended';
    }


    // =====================================================
    // LOCAL COMPANY UPDATE
    // =====================================================

    private replaceCompany(
        updatedCompany: Company
    ): void {

        this.companies.update(
            (companies) =>

                companies.map(
                    (company) => {

                        if (
                            company.id !==
                            updatedCompany.id
                        ) {
                            return company;
                        }


                        // Preserve list-only counts because
                        // activate/suspend responses do not
                        // return those aggregate fields.
                        return {

                            ...company,

                            ...updatedCompany
                        };
                    }
                )
        );
    }
}