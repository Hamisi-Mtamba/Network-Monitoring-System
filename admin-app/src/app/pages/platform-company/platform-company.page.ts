// Import Angular component utilities
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    signal
} from '@angular/core';


// Import Angular common pipes
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
    ActivatedRoute,
    Router
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


// Import icons used on the company workspace
import {
    addOutline,
    arrowBackOutline,
    businessOutline,
    cardOutline,
    checkmarkCircleOutline,
    closeCircleOutline,
    colorPaletteOutline,
    cubeOutline,
    eyeOutline,
    imageOutline,
    keyOutline,
    peopleOutline,
    personOutline,
    refreshOutline,
    saveOutline,
    statsChartOutline,
    timeOutline,
    trashOutline,
    walletOutline,
    wifiOutline
} from 'ionicons/icons';


// Import RxJS helper
import {
    finalize
} from 'rxjs';


// Import company models
import {
    Company,
    CompanyBrandingImageType,
    UpdateCompanyBrandingRequest
} from '../../models/company.model';


// Import administrator models
import {
    Admin,
    CreateCompanyAdminRequest
} from '../../models/admin.model';


// Import package models
import {
    CreateCompanyPackageRequest,
    InternetPackage,
    UpdateCompanyPackageRequest
} from '../../models/package.model';


// Import payment models
import {
    Payment,
    PaymentInternetSession
} from '../../models/payment.model';


// Import session models
import {
    InternetSession,
    SessionStatus
} from '../../models/session.model';

// Import report models
import {
    CompanyPaymentReportItem,
    CompanyRevenueReportItem,
    CompanySessionReportItem
} from '../../models/report.model';


// Import company service
import {
    CompanyService
} from '../../services/company.service';


// Import company administrator service
import {
    AdminService
} from '../../services/admin.service';


// Import package service
import {
    PackageService
} from '../../services/package.service';


// Import payment service
import {
    PaymentService
} from '../../services/payment.service';


// Import session service
import {
    SessionService
} from '../../services/session.service';

// Import report service
import {
    ReportService
} from '../../services/report.service';


// Import shared UI service
import {
    UiService
} from '../../services/ui.service';


/* =========================================================
   COMPANY WORKSPACE NAVIGATION MODEL
   ========================================================= */

interface CompanyWorkspaceSection {

    label: string;

    key:
        | 'overview'
        | 'admins'
        | 'packages'
        | 'payments'
        | 'sessions'
        | 'reports'
        | 'branding';

    icon: string;
}


/* =========================================================
   PLATFORM COMPANY PAGE
   ========================================================= */

@Component({
    selector: 'app-platform-company',

    standalone: true,

    imports: [
        DatePipe,
        ReactiveFormsModule,
        IonButton,
        IonIcon,
        IonInput,
        IonSpinner
    ],

    templateUrl:
        './platform-company.page.html',

    styleUrl:
        './platform-company.page.scss',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})
export class PlatformCompanyPage {

    // =====================================================
    // SERVICES
    // =====================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly companyService =
        inject(CompanyService);

    private readonly adminService =
        inject(AdminService);

    private readonly packageService =
        inject(PackageService);

    private readonly paymentService =
        inject(PaymentService);

    private readonly sessionService =
        inject(SessionService);

    private readonly reportService =
        inject(ReportService);

    private readonly ui =
        inject(UiService);

    private readonly fb =
        inject(FormBuilder);


    // =====================================================
    // COMPANY PAGE STATE
    // =====================================================

    readonly loading =
        signal(true);

    readonly saving =
        signal(false);

    readonly error =
        signal(false);

    readonly errorMessage =
        signal('');

    readonly company =
        signal<Company | null>(null);

    readonly activeSection =
        signal<CompanyWorkspaceSection['key']>(
            'overview'
        );


    // =====================================================
    // ADMIN MANAGEMENT STATE
    // =====================================================

    readonly admins =
        signal<Admin[]>([]);

    readonly adminsLoading =
        signal(false);

    readonly adminsLoaded =
        signal(false);

    readonly adminSaving =
        signal(false);

    readonly adminActionId =
        signal<number | null>(null);

    readonly adminErrorMessage =
        signal('');

    readonly showCreateAdminForm =
        signal(false);

    readonly editingAdmin =
        signal<Admin | null>(null);

    readonly passwordAdmin =
        signal<Admin | null>(null);


    // =====================================================
    // PACKAGE MANAGEMENT STATE
    // =====================================================

    readonly packages =
        signal<InternetPackage[]>([]);

    readonly packagesLoading =
        signal(false);

    readonly packagesLoaded =
        signal(false);

    readonly packageSaving =
        signal(false);

    readonly packageActionId =
        signal<number | null>(null);

    readonly packageErrorMessage =
        signal('');

    readonly showCreatePackageForm =
        signal(false);

    readonly editingPackage =
        signal<InternetPackage | null>(null);

    readonly schedulePackage =
        signal<InternetPackage | null>(null);


    // =====================================================
    // PAYMENT MANAGEMENT STATE
    // =====================================================

    readonly payments =
        signal<Payment[]>([]);

    readonly paymentsLoading =
        signal(false);

    readonly paymentsLoaded =
        signal(false);

    readonly paymentErrorMessage =
        signal('');

    readonly selectedPayment =
        signal<Payment | null>(null);

    readonly selectedPaymentSession =
        signal<PaymentInternetSession | null>(null);

    readonly paymentDetailsLoading =
        signal(false);


    // =====================================================
    // SESSION MANAGEMENT STATE
    // =====================================================

    readonly sessions =
        signal<InternetSession[]>([]);

    readonly sessionsLoading =
        signal(false);

    readonly sessionsLoaded =
        signal(false);

    readonly sessionErrorMessage =
        signal('');

    readonly selectedSession =
        signal<InternetSession | null>(null);

    readonly sessionDetailsLoading =
        signal(false);

    readonly sessionActionId =
        signal<number | null>(null);


    // =====================================================
    // REPORT MANAGEMENT STATE
    // =====================================================

    readonly reportsLoading =
        signal(false);

    readonly reportsLoaded =
        signal(false);

    readonly reportErrorMessage =
        signal('');

    readonly revenueReport =
        signal<CompanyRevenueReportItem[]>([]);

    readonly paymentReport =
        signal<CompanyPaymentReportItem[]>([]);

    readonly sessionReport =
        signal<CompanySessionReportItem[]>([]);

    readonly reportTotalRevenue =
        signal(0);


    // =====================================================
    // BRANDING MANAGEMENT STATE
    // =====================================================

    readonly brandingSaving =
        signal(false);

    readonly brandingErrorMessage =
        signal('');

    readonly brandingSuccessMessage =
        signal('');

    readonly brandingUploading =
        signal<CompanyBrandingImageType | 'logo' | null>(
            null
        );

    readonly brandingRemoving =
        signal<CompanyBrandingImageType | 'logo' | null>(
            null
        );


    // =====================================================
    // COMPANY ID
    // =====================================================

    readonly companyId =
        computed(() => {

            return Number(
                this.route.snapshot.paramMap.get(
                    'companyId'
                )
            );
        });


    // =====================================================
    // WORKSPACE SECTIONS
    // =====================================================

    readonly sections:
        CompanyWorkspaceSection[] = [

        {
            label: 'Overview',
            key: 'overview',
            icon: 'business-outline'
        },

        {
            label: 'Admins',
            key: 'admins',
            icon: 'people-outline'
        },

        {
            label: 'Packages',
            key: 'packages',
            icon: 'cube-outline'
        },

        {
            label: 'Payments',
            key: 'payments',
            icon: 'card-outline'
        },

        {
            label: 'Sessions',
            key: 'sessions',
            icon: 'wifi-outline'
        },

        {
            label: 'Reports',
            key: 'reports',
            icon: 'stats-chart-outline'
        },

        {
            label: 'Branding',
            key: 'branding',
            icon: 'color-palette-outline'
        }
    ];


    // =====================================================
    // COMPANY FORM
    // =====================================================

    readonly companyForm =
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
    // CREATE ADMIN FORM
    // =====================================================

    readonly createAdminForm =
        this.fb.nonNullable.group({

            name: [
                '',
                [
                    Validators.required,
                    Validators.minLength(2),
                    Validators.maxLength(200)
                ]
            ],

            email: [
                '',
                [
                    Validators.required,
                    Validators.email
                ]
            ],

            password: [
                '',
                [
                    Validators.required,
                    Validators.minLength(8)
                ]
            ]
        });


    // =====================================================
    // EDIT ADMIN FORM
    // =====================================================

    readonly editAdminForm =
        this.fb.nonNullable.group({

            name: [
                '',
                [
                    Validators.required,
                    Validators.minLength(2),
                    Validators.maxLength(200)
                ]
            ],

            email: [
                '',
                [
                    Validators.required,
                    Validators.email
                ]
            ]
        });


    // =====================================================
    // CHANGE PASSWORD FORM
    // =====================================================

    readonly passwordForm =
        this.fb.nonNullable.group({

            password: [
                '',
                [
                    Validators.required,
                    Validators.minLength(8)
                ]
            ],

            confirmPassword: [
                '',
                [
                    Validators.required,
                    Validators.minLength(8)
                ]
            ]
        });


    // =====================================================
    // CREATE PACKAGE FORM
    // =====================================================

    readonly createPackageForm =
        this.fb.nonNullable.group({

            name: [
                '',
                [
                    Validators.required,
                    Validators.minLength(2)
                ]
            ],

            price: [
                0,
                [
                    Validators.required,
                    Validators.min(1)
                ]
            ],

            duration_minutes: [
                0,
                [
                    Validators.required,
                    Validators.min(1)
                ]
            ],

            speed: [
                '',
                [
                    Validators.required
                ]
            ]
        });


    // =====================================================
    // EDIT PACKAGE FORM
    // =====================================================

    readonly editPackageForm =
        this.fb.nonNullable.group({

            name: [
                '',
                [
                    Validators.required,
                    Validators.minLength(2)
                ]
            ],

            price: [
                0,
                [
                    Validators.required,
                    Validators.min(1)
                ]
            ],

            duration_minutes: [
                0,
                [
                    Validators.required,
                    Validators.min(1)
                ]
            ],

            speed: [
                '',
                [
                    Validators.required
                ]
            ]
        });


    // =====================================================
    // PACKAGE SCHEDULE FORM
    // =====================================================

    readonly packageScheduleForm =
        this.fb.nonNullable.group({

            available_from: [
                ''
            ],

            available_until: [
                ''
            ]
        });


    // =====================================================
    // BRANDING FORM
    // =====================================================

    readonly brandingForm =
        this.fb.nonNullable.group({

            primary_color: [
                '#2563EB',
                [
                    Validators.required,
                    Validators.pattern(
                        /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/
                    )
                ]
            ],

            secondary_color: [
                '#111827',
                [
                    Validators.required,
                    Validators.pattern(
                        /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/
                    )
                ]
            ],

            accent_color: [
                '#22C55E',
                [
                    Validators.required,
                    Validators.pattern(
                        /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/
                    )
                ]
            ],

            background_color: [
                '#F8FAFC',
                [
                    Validators.required,
                    Validators.pattern(
                        /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/
                    )
                ]
            ],

            navbar_color: [
                '#FFFFFF',
                [
                    Validators.required,
                    Validators.pattern(
                        /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/
                    )
                ]
            ],

            background_image_url: [
                ''
            ],

            login_image_url: [
                ''
            ],

            banner_image_url: [
                ''
            ]
        });


    // =====================================================
    // ADMIN COUNTS
    // =====================================================

    readonly activeAdminCount =
        computed(() => {

            return this.admins()
                .filter(
                    (admin) =>
                        admin.status === 'active' ||
                        admin.is_active === true
                )
                .length;
        });


    readonly suspendedAdminCount =
        computed(() => {

            return this.admins()
                .filter(
                    (admin) =>
                        admin.status === 'suspended' ||
                        admin.is_active === false
                )
                .length;
        });


    // =====================================================
    // PACKAGE COUNTS
    // =====================================================

    readonly activePackageCount =
        computed(() => {

            return this.packages()
                .filter(
                    (item) =>
                        item.is_active
                )
                .length;
        });


    readonly inactivePackageCount =
        computed(() => {

            return this.packages()
                .filter(
                    (item) =>
                        !item.is_active
                )
                .length;
        });


    // =====================================================
    // PAYMENT COUNTS / TOTALS
    // =====================================================

    readonly successfulPaymentCount =
        computed(() => {

            return this.payments()
                .filter(
                    (payment) =>
                        payment.status ===
                        'successful'
                )
                .length;
        });


    readonly pendingPaymentCount =
        computed(() => {

            return this.payments()
                .filter(
                    (payment) =>
                        payment.status ===
                        'pending'
                )
                .length;
        });


    readonly failedPaymentCount =
        computed(() => {

            return this.payments()
                .filter(
                    (payment) =>
                        payment.status ===
                        'failed'
                )
                .length;
        });


    readonly successfulRevenue =
        computed(() => {

            return this.payments()
                .filter(
                    (payment) =>
                        payment.status ===
                        'successful'
                )
                .reduce(
                    (total, payment) =>
                        total +
                        Number(
                            payment.amount
                        ),
                    0
                );
        });


    // =====================================================
    // SESSION COUNTS
    // =====================================================

    readonly activeSessionCount =
        computed(() => {

            return this.sessions()
                .filter(
                    (session) =>
                        session.status ===
                        'active'
                )
                .length;
        });


    readonly suspendedSessionCount =
        computed(() => {

            return this.sessions()
                .filter(
                    (session) =>
                        session.status ===
                        'suspended'
                )
                .length;
        });


    readonly expiredSessionCount =
        computed(() => {

            return this.sessions()
                .filter(
                    (session) =>
                        session.status ===
                        'expired'
                )
                .length;
        });


    readonly pendingActivationSessionCount =
        computed(() => {

            return this.sessions()
                .filter(
                    (session) =>
                        session.status ===
                        'pending_activation'
                )
                .length;
        });


    readonly failedSessionCount =
        computed(() => {

            return this.sessions()
                .filter(
                    (session) =>
                        session.status ===
                        'failed'
                )
                .length;
        });


    // =====================================================
    // REPORT COUNTS / TOTALS
    // =====================================================

    readonly reportSuccessfulPayments =
        computed(() => {

            return this.paymentReport()
                .find(
                    (item) =>
                        item.status ===
                        'successful'
                )
                ?.payment_count ?? 0;
        });


    readonly reportPendingPayments =
        computed(() => {

            return this.paymentReport()
                .find(
                    (item) =>
                        item.status ===
                        'pending'
                )
                ?.payment_count ?? 0;
        });


    readonly reportFailedPayments =
        computed(() => {

            return this.paymentReport()
                .find(
                    (item) =>
                        item.status ===
                        'failed'
                )
                ?.payment_count ?? 0;
        });


    readonly reportTotalPayments =
        computed(() => {

            return this.paymentReport()
                .reduce(
                    (total, item) =>
                        total +
                        Number(
                            item.payment_count
                        ),
                    0
                );
        });


    readonly reportTotalSessions =
        computed(() => {

            return this.sessionReport()
                .reduce(
                    (total, item) =>
                        total +
                        Number(
                            item.session_count
                        ),
                    0
                );
        });


    readonly reportActiveSessions =
        computed(() => {

            return this.sessionReport()
                .find(
                    (item) =>
                        item.status ===
                        'active'
                )
                ?.session_count ?? 0;
        });


    readonly reportExpiredSessions =
        computed(() => {

            return this.sessionReport()
                .find(
                    (item) =>
                        item.status ===
                        'expired'
                )
                ?.session_count ?? 0;
        });


    readonly latestRevenueDate =
        computed(() => {

            return this.revenueReport()
                .at(0)
                ?.date ?? null;
        });


    // =====================================================
    // BRANDING PREVIEW VALUES
    // =====================================================

    readonly logoUrl =
        computed(() =>
            this.company()?.logo_url ?? null
        );

    readonly backgroundImageUrl =
        computed(() =>
            this.company()
                ?.settings
                ?.branding
                ?.background_image_url ?? null
        );

    readonly loginImageUrl =
        computed(() =>
            this.company()
                ?.settings
                ?.branding
                ?.login_image_url ?? null
        );

    readonly bannerImageUrl =
        computed(() =>
            this.company()
                ?.settings
                ?.branding
                ?.banner_image_url ?? null
        );


    // =====================================================
    // CONSTRUCTOR
    // =====================================================

    constructor() {

        addIcons({
            addOutline,
            arrowBackOutline,
            businessOutline,
            cardOutline,
            checkmarkCircleOutline,
            closeCircleOutline,
            colorPaletteOutline,
            cubeOutline,
            eyeOutline,
            imageOutline,
            keyOutline,
            peopleOutline,
            personOutline,
            refreshOutline,
            saveOutline,
            statsChartOutline,
            timeOutline,
            trashOutline,
            walletOutline,
            wifiOutline
        });


        this.loadCompany();
    }


    // =====================================================
    // LOAD COMPANY
    // =====================================================

    loadCompany(): void {

        const companyId =
            this.companyId();


        if (
            !Number.isInteger(companyId) ||
            companyId <= 0
        ) {

            this.error.set(true);

            this.errorMessage.set(
                'The selected company ID is invalid.'
            );

            this.loading.set(false);

            return;
        }


        this.loading.set(true);

        this.error.set(false);

        this.errorMessage.set('');


        this.companyService
            .getCompanyById(companyId)
            .pipe(
                finalize(
                    () =>
                        this.loading.set(false)
                )
            )
            .subscribe({

                next: (response) => {

                    this.company.set(
                        response.company
                    );


                    this.populateForm(
                        response.company
                    );

                    this.populateBrandingForm(
                        response.company
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to load company:',
                        error
                    );


                    this.error.set(true);

                    this.errorMessage.set(
                        error?.error?.message ||
                        'The selected company could not be loaded.'
                    );
                }
            });
    }


    // =====================================================
    // CHANGE WORKSPACE SECTION
    // =====================================================

    selectSection(
        section:
            CompanyWorkspaceSection['key']
    ): void {

        this.activeSection.set(
            section
        );


        if (
            section === 'admins' &&
            !this.adminsLoaded()
        ) {
            this.loadAdmins();
        }


        if (
            section === 'packages' &&
            !this.packagesLoaded()
        ) {
            this.loadPackages();
        }


        if (
            section === 'payments' &&
            !this.paymentsLoaded()
        ) {
            this.loadPayments();
        }


        if (
            section === 'sessions' &&
            !this.sessionsLoaded()
        ) {
            this.loadSessions();
        }


        if (
            section === 'reports' &&
            !this.reportsLoaded()
        ) {
            this.loadReports();
        }


        if (
            section === 'branding'
        ) {

            const company =
                this.company();

            if (company) {

                this.populateBrandingForm(
                    company
                );
            }
        }
    }


    // =====================================================
    // SAVE COMPANY PROFILE
    // =====================================================

    saveCompany(): void {

        const company =
            this.company();


        if (!company) {
            return;
        }


        this.errorMessage.set('');


        if (this.companyForm.invalid) {

            this.companyForm.markAllAsTouched();

            return;
        }


        const raw =
            this.companyForm.getRawValue();


        this.saving.set(true);


        this.companyService
            .updateCompany(
                company.id,
                {
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
                }
            )
            .pipe(
                finalize(
                    () =>
                        this.saving.set(false)
                )
            )
            .subscribe({

                next: (response) => {

                    this.company.set(
                        response.company
                    );


                    this.populateForm(
                        response.company
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to update company:',
                        error
                    );


                    this.errorMessage.set(
                        error?.error?.message ||
                        'The company could not be updated.'
                    );
                }
            });
    }


    // =====================================================
    // LOAD COMPANY ADMINS
    // =====================================================

    loadAdmins(): void {

        const companyId =
            this.companyId();


        if (
            !Number.isInteger(companyId) ||
            companyId <= 0
        ) {
            return;
        }


        this.adminsLoading.set(true);

        this.adminErrorMessage.set('');


        this.adminService
            .getCompanyAdmins(companyId)
            .pipe(
                finalize(
                    () =>
                        this.adminsLoading.set(false)
                )
            )
            .subscribe({

                next: (response) => {

                    this.admins.set(
                        response.admins
                    );

                    this.adminsLoaded.set(
                        true
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to load company administrators:',
                        error
                    );


                    this.adminErrorMessage.set(
                        error?.error?.message ||
                        'Company administrators could not be loaded.'
                    );
                }
            });
    }


    // =====================================================
    // CREATE ADMIN FORM
    // =====================================================

    openCreateAdminForm(): void {

        this.adminErrorMessage.set('');


        this.createAdminForm.reset({
            name: '',
            email: '',
            password: ''
        });


        this.showCreateAdminForm.set(
            true
        );
    }


    closeCreateAdminForm(): void {

        if (this.adminSaving()) {
            return;
        }


        this.showCreateAdminForm.set(
            false
        );


        this.createAdminForm.reset({
            name: '',
            email: '',
            password: ''
        });
    }


    // =====================================================
    // CREATE COMPANY ADMIN
    // =====================================================

    createAdmin(): void {

        if (
            this.createAdminForm.invalid
        ) {

            this.createAdminForm
                .markAllAsTouched();

            return;
        }


        const raw =
            this.createAdminForm
                .getRawValue();


        const payload:
            CreateCompanyAdminRequest = {

            name:
                raw.name.trim(),

            email:
                raw.email
                    .trim()
                    .toLowerCase(),

            password:
                raw.password
        };


        this.adminSaving.set(true);

        this.adminErrorMessage.set('');


        this.adminService
            .createCompanyAdmin(
                this.companyId(),
                payload
            )
            .pipe(
                finalize(
                    () =>
                        this.adminSaving.set(false)
                )
            )
            .subscribe({

                next: (response) => {

                    this.admins.update(
                        (admins) => [
                            ...admins,
                            response.admin
                        ]
                    );


                    this.showCreateAdminForm.set(
                        false
                    );


                    this.createAdminForm.reset({
                        name: '',
                        email: '',
                        password: ''
                    });
                },


                error: (error) => {

                    console.error(
                        'Failed to create company administrator:',
                        error
                    );


                    this.adminErrorMessage.set(
                        error?.error?.message ||
                        'The administrator could not be created.'
                    );
                }
            });
    }


    // =====================================================
    // EDIT ADMIN FORM
    // =====================================================

    openEditAdminForm(
        admin: Admin
    ): void {

        this.adminErrorMessage.set('');

        this.editingAdmin.set(
            admin
        );


        this.editAdminForm.setValue({
            name:
                admin.name,

            email:
                admin.email
        });
    }


    closeEditAdminForm(): void {

        if (this.adminSaving()) {
            return;
        }


        this.editingAdmin.set(
            null
        );
    }


    // =====================================================
    // UPDATE COMPANY ADMIN
    // =====================================================

    updateAdmin(): void {

        const admin =
            this.editingAdmin();


        if (!admin) {
            return;
        }


        if (
            this.editAdminForm.invalid
        ) {

            this.editAdminForm
                .markAllAsTouched();

            return;
        }


        const raw =
            this.editAdminForm
                .getRawValue();


        this.adminSaving.set(true);

        this.adminErrorMessage.set('');


        this.adminService
            .updateCompanyAdmin(
                this.companyId(),
                admin.id,
                {
                    name:
                        raw.name.trim(),

                    email:
                        raw.email
                            .trim()
                            .toLowerCase()
                }
            )
            .pipe(
                finalize(
                    () =>
                        this.adminSaving.set(false)
                )
            )
            .subscribe({

                next: (response) => {

                    this.replaceAdmin(
                        response.admin
                    );

                    this.editingAdmin.set(
                        null
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to update company administrator:',
                        error
                    );


                    this.adminErrorMessage.set(
                        error?.error?.message ||
                        'The administrator could not be updated.'
                    );
                }
            });
    }


    // =====================================================
    // PASSWORD FORM
    // =====================================================

    openPasswordForm(
        admin: Admin
    ): void {

        this.adminErrorMessage.set('');

        this.passwordAdmin.set(
            admin
        );


        this.passwordForm.reset({
            password: '',
            confirmPassword: ''
        });
    }


    closePasswordForm(): void {

        if (this.adminSaving()) {
            return;
        }


        this.passwordAdmin.set(
            null
        );


        this.passwordForm.reset({
            password: '',
            confirmPassword: ''
        });
    }


    // =====================================================
    // CHANGE ADMIN PASSWORD
    // =====================================================

    changeAdminPassword(): void {

        const admin =
            this.passwordAdmin();


        if (!admin) {
            return;
        }


        if (
            this.passwordForm.invalid
        ) {

            this.passwordForm
                .markAllAsTouched();

            return;
        }


        const raw =
            this.passwordForm
                .getRawValue();


        if (
            raw.password !==
            raw.confirmPassword
        ) {

            this.adminErrorMessage.set(
                'The new passwords do not match.'
            );

            return;
        }


        this.adminSaving.set(true);

        this.adminErrorMessage.set('');


        this.adminService
            .changeCompanyAdminPassword(
                this.companyId(),
                admin.id,
                {
                    password:
                        raw.password
                }
            )
            .pipe(
                finalize(
                    () =>
                        this.adminSaving.set(false)
                )
            )
            .subscribe({

                next: () => {

                    this.passwordAdmin.set(
                        null
                    );


                    this.passwordForm.reset({
                        password: '',
                        confirmPassword: ''
                    });
                },


                error: (error) => {

                    console.error(
                        'Failed to change administrator password:',
                        error
                    );


                    this.adminErrorMessage.set(
                        error?.error?.message ||
                        'The administrator password could not be changed.'
                    );
                }
            });
    }


    // =====================================================
    // SUSPEND ADMIN
    // =====================================================

    async suspendAdmin(
        admin: Admin
    ): Promise<void> {

        const confirmed =
            await this.ui.confirm(
                'Suspend administrator?',
                `${admin.name} will no longer be able to access this company administration area.`,
                'Suspend'
            );


        if (!confirmed) {
            return;
        }


        this.adminActionId.set(
            admin.id
        );

        this.adminErrorMessage.set('');


        this.adminService
            .suspendCompanyAdmin(
                this.companyId(),
                admin.id
            )
            .pipe(
                finalize(
                    () =>
                        this.adminActionId.set(null)
                )
            )
            .subscribe({

                next: (response) => {

                    this.replaceAdmin(
                        response.admin
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to suspend administrator:',
                        error
                    );


                    this.adminErrorMessage.set(
                        error?.error?.message ||
                        'The administrator could not be suspended.'
                    );
                }
            });
    }


    // =====================================================
    // ACTIVATE ADMIN
    // =====================================================

    async activateAdmin(
        admin: Admin
    ): Promise<void> {

        const confirmed =
            await this.ui.confirm(
                'Activate administrator?',
                `${admin.name} will be allowed to access the company administration area again.`,
                'Activate'
            );


        if (!confirmed) {
            return;
        }


        this.adminActionId.set(
            admin.id
        );

        this.adminErrorMessage.set('');


        this.adminService
            .activateCompanyAdmin(
                this.companyId(),
                admin.id
            )
            .pipe(
                finalize(
                    () =>
                        this.adminActionId.set(null)
                )
            )
            .subscribe({

                next: (response) => {

                    this.replaceAdmin(
                        response.admin
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to activate administrator:',
                        error
                    );


                    this.adminErrorMessage.set(
                        error?.error?.message ||
                        'The administrator could not be activated.'
                    );
                }
            });
    }


    // =====================================================
    // DELETE ADMIN
    // =====================================================

    async deleteAdmin(
        admin: Admin
    ): Promise<void> {

        const confirmed =
            await this.ui.confirm(
                'Delete administrator?',
                `${admin.name} will be permanently removed from this company.`,
                'Delete'
            );


        if (!confirmed) {
            return;
        }


        this.adminActionId.set(
            admin.id
        );

        this.adminErrorMessage.set('');


        this.adminService
            .deleteCompanyAdmin(
                this.companyId(),
                admin.id
            )
            .pipe(
                finalize(
                    () =>
                        this.adminActionId.set(null)
                )
            )
            .subscribe({

                next: () => {

                    this.admins.update(
                        (admins) =>
                            admins.filter(
                                (item) =>
                                    item.id !==
                                    admin.id
                            )
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to delete administrator:',
                        error
                    );


                    this.adminErrorMessage.set(
                        error?.error?.message ||
                        'The administrator could not be deleted.'
                    );
                }
            });
    }


    // =====================================================
    // ADMIN STATUS HELPERS
    // =====================================================

    adminIsActive(
        admin: Admin
    ): boolean {

        return (
            admin.status === 'active' ||
            admin.is_active === true
        );
    }


    adminStatusLabel(
        admin: Admin
    ): string {

        return this.adminIsActive(admin)
            ? 'Active'
            : 'Suspended';
    }


    adminStatusClass(
        admin: Admin
    ): string {

        return this.adminIsActive(admin)
            ? 'status--active'
            : 'status--suspended';
    }


    // =====================================================
    // LOAD COMPANY PACKAGES
    // =====================================================

    loadPackages(): void {

        const companyId =
            this.companyId();


        if (
            !Number.isInteger(companyId) ||
            companyId <= 0
        ) {
            return;
        }


        this.packagesLoading.set(
            true
        );

        this.packageErrorMessage.set(
            ''
        );


        this.packageService
            .getCompanyPackages(
                companyId
            )
            .pipe(
                finalize(
                    () =>
                        this.packagesLoading.set(false)
                )
            )
            .subscribe({

                next: (response) => {

                    this.packages.set(
                        response.packages
                    );

                    this.packagesLoaded.set(
                        true
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to load company packages:',
                        error
                    );


                    this.packageErrorMessage.set(
                        error?.error?.message ||
                        'Company packages could not be loaded.'
                    );
                }
            });
    }


    // =====================================================
    // CREATE PACKAGE FORM
    // =====================================================

    openCreatePackageForm(): void {

        this.packageErrorMessage.set(
            ''
        );


        this.createPackageForm.reset({
            name: '',
            price: 0,
            duration_minutes: 0,
            speed: ''
        });


        this.showCreatePackageForm.set(
            true
        );
    }


    closeCreatePackageForm(): void {

        if (this.packageSaving()) {
            return;
        }


        this.showCreatePackageForm.set(
            false
        );


        this.createPackageForm.reset({
            name: '',
            price: 0,
            duration_minutes: 0,
            speed: ''
        });
    }


    // =====================================================
    // CREATE COMPANY PACKAGE
    // =====================================================

    createCompanyPackage(): void {

        if (
            this.createPackageForm.invalid
        ) {

            this.createPackageForm
                .markAllAsTouched();

            return;
        }


        const raw =
            this.createPackageForm
                .getRawValue();


        const payload:
            CreateCompanyPackageRequest = {

            name:
                raw.name.trim(),

            price:
                Number(raw.price),

            duration_minutes:
                Number(
                    raw.duration_minutes
                ),

            speed:
                raw.speed.trim()
        };


        this.packageSaving.set(
            true
        );

        this.packageErrorMessage.set(
            ''
        );


        this.packageService
            .createCompanyPackage(
                this.companyId(),
                payload
            )
            .pipe(
                finalize(
                    () =>
                        this.packageSaving.set(false)
                )
            )
            .subscribe({

                next: (response) => {

                    this.packages.update(
                        (packages) =>
                            [
                                ...packages,
                                response.package
                            ]
                                .sort(
                                    (a, b) =>
                                        Number(a.price) -
                                        Number(b.price)
                                )
                    );


                    this.showCreatePackageForm.set(
                        false
                    );


                    this.createPackageForm.reset({
                        name: '',
                        price: 0,
                        duration_minutes: 0,
                        speed: ''
                    });
                },


                error: (error) => {

                    console.error(
                        'Failed to create company package:',
                        error
                    );


                    this.packageErrorMessage.set(
                        error?.error?.message ||
                        'The package could not be created.'
                    );
                }
            });
    }


    // =====================================================
    // EDIT PACKAGE FORM
    // =====================================================

    openEditPackageForm(
        item: InternetPackage
    ): void {

        this.packageErrorMessage.set(
            ''
        );


        this.editingPackage.set(
            item
        );


        this.editPackageForm.setValue({

            name:
                item.name,

            price:
                Number(item.price),

            duration_minutes:
                item.duration_minutes,

            speed:
                item.speed
        });
    }


    closeEditPackageForm(): void {

        if (this.packageSaving()) {
            return;
        }


        this.editingPackage.set(
            null
        );
    }


    // =====================================================
    // UPDATE COMPANY PACKAGE
    // =====================================================

    updateCompanyPackage(): void {

        const item =
            this.editingPackage();


        if (!item) {
            return;
        }


        if (
            this.editPackageForm.invalid
        ) {

            this.editPackageForm
                .markAllAsTouched();

            return;
        }


        const raw =
            this.editPackageForm
                .getRawValue();


        const payload:
            UpdateCompanyPackageRequest = {

            name:
                raw.name.trim(),

            price:
                Number(raw.price),

            duration_minutes:
                Number(
                    raw.duration_minutes
                ),

            speed:
                raw.speed.trim()
        };


        this.packageSaving.set(
            true
        );

        this.packageErrorMessage.set(
            ''
        );


        this.packageService
            .updateCompanyPackage(
                this.companyId(),
                item.id,
                payload
            )
            .pipe(
                finalize(
                    () =>
                        this.packageSaving.set(false)
                )
            )
            .subscribe({

                next: (response) => {

                    this.replacePackage(
                        response.package
                    );

                    this.sortPackages();

                    this.editingPackage.set(
                        null
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to update company package:',
                        error
                    );


                    this.packageErrorMessage.set(
                        error?.error?.message ||
                        'The package could not be updated.'
                    );
                }
            });
    }


    // =====================================================
    // PACKAGE SCHEDULE FORM
    // =====================================================

    openPackageScheduleForm(
        item: InternetPackage
    ): void {

        this.packageErrorMessage.set(
            ''
        );


        this.schedulePackage.set(
            item
        );


        this.packageScheduleForm.setValue({

            available_from:
                this.toDateTimeLocal(
                    item.available_from
                ),

            available_until:
                this.toDateTimeLocal(
                    item.available_until
                )
        });
    }


    closePackageScheduleForm(): void {

        if (this.packageSaving()) {
            return;
        }


        this.schedulePackage.set(
            null
        );


        this.packageScheduleForm.reset({
            available_from: '',
            available_until: ''
        });
    }


    // =====================================================
    // UPDATE PACKAGE SCHEDULE
    // =====================================================

    updatePackageSchedule(): void {

        const item =
            this.schedulePackage();


        if (!item) {
            return;
        }


        const raw =
            this.packageScheduleForm
                .getRawValue();


        const availableFrom =
            raw.available_from
                ? new Date(
                    raw.available_from
                ).toISOString()
                : null;


        const availableUntil =
            raw.available_until
                ? new Date(
                    raw.available_until
                ).toISOString()
                : null;


        if (
            availableFrom &&
            availableUntil &&
            new Date(availableUntil) <=
                new Date(availableFrom)
        ) {

            this.packageErrorMessage.set(
                'Availability end must be after availability start.'
            );

            return;
        }


        this.packageSaving.set(
            true
        );

        this.packageErrorMessage.set(
            ''
        );


        this.packageService
            .setCompanyPackageSchedule(
                this.companyId(),
                item.id,
                availableFrom,
                availableUntil
            )
            .pipe(
                finalize(
                    () =>
                        this.packageSaving.set(false)
                )
            )
            .subscribe({

                next: (response) => {

                    this.replacePackage(
                        response.package
                    );


                    this.schedulePackage.set(
                        null
                    );


                    this.packageScheduleForm.reset({
                        available_from: '',
                        available_until: ''
                    });
                },


                error: (error) => {

                    console.error(
                        'Failed to update package schedule:',
                        error
                    );


                    this.packageErrorMessage.set(
                        error?.error?.message ||
                        'The package schedule could not be updated.'
                    );
                }
            });
    }


    // =====================================================
    // ACTIVATE / DEACTIVATE PACKAGE
    // =====================================================

    async togglePackageStatus(
        item: InternetPackage
    ): Promise<void> {

        const nextStatus =
            !item.is_active;


        const confirmed =
            await this.ui.confirm(
                nextStatus
                    ? 'Activate package?'
                    : 'Deactivate package?',
                nextStatus
                    ? `${item.name} will become available as an active company package.`
                    : `${item.name} will be disabled and should no longer be offered as an active package.`,
                nextStatus
                    ? 'Activate'
                    : 'Deactivate'
            );


        if (!confirmed) {
            return;
        }


        this.packageActionId.set(
            item.id
        );

        this.packageErrorMessage.set(
            ''
        );


        this.packageService
            .setCompanyPackageStatus(
                this.companyId(),
                item.id,
                nextStatus
            )
            .pipe(
                finalize(
                    () =>
                        this.packageActionId.set(null)
                )
            )
            .subscribe({

                next: (response) => {

                    this.replacePackage(
                        response.package
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to update package status:',
                        error
                    );


                    this.packageErrorMessage.set(
                        error?.error?.message ||
                        'The package status could not be updated.'
                    );
                }
            });
    }


    // =====================================================
    // DELETE COMPANY PACKAGE
    // =====================================================

    async deletePackage(
        item: InternetPackage
    ): Promise<void> {

        const confirmed =
            await this.ui.confirm(
                'Delete package?',
                `${item.name} will be permanently removed. Packages with related historical records may not be deletable.`,
                'Delete'
            );


        if (!confirmed) {
            return;
        }


        this.packageActionId.set(
            item.id
        );

        this.packageErrorMessage.set(
            ''
        );


        this.packageService
            .deleteCompanyPackage(
                this.companyId(),
                item.id
            )
            .pipe(
                finalize(
                    () =>
                        this.packageActionId.set(null)
                )
            )
            .subscribe({

                next: () => {

                    this.packages.update(
                        (packages) =>
                            packages.filter(
                                (packageItem) =>
                                    packageItem.id !==
                                    item.id
                            )
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to delete company package:',
                        error
                    );


                    this.packageErrorMessage.set(
                        error?.error?.message ||
                        'The package could not be deleted.'
                    );
                }
            });
    }


    // =====================================================
    // PACKAGE DISPLAY HELPERS
    // =====================================================

    packageStatusLabel(
        item: InternetPackage
    ): string {

        return item.is_active
            ? 'Active'
            : 'Inactive';
    }


    packageStatusClass(
        item: InternetPackage
    ): string {

        return item.is_active
            ? 'status--active'
            : 'status--suspended';
    }


    packagePrice(
        item: InternetPackage
    ): string {

        return Number(
            item.price
        ).toLocaleString(
            'en-TZ',
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        );
    }


    packageDuration(
        minutes: number
    ): string {

        if (
            minutes % 1440 === 0
        ) {

            const days =
                minutes / 1440;


            return days === 1
                ? '1 day'
                : `${days} days`;
        }


        if (
            minutes % 60 === 0
        ) {

            const hours =
                minutes / 60;


            return hours === 1
                ? '1 hour'
                : `${hours} hours`;
        }


        return `${minutes} min`;
    }


    // =====================================================
    // LOAD COMPANY PAYMENTS
    // =====================================================

    loadPayments(): void {

        const companyId =
            this.companyId();


        if (
            !Number.isInteger(companyId) ||
            companyId <= 0
        ) {
            return;
        }


        this.paymentsLoading.set(
            true
        );

        this.paymentErrorMessage.set(
            ''
        );


        this.paymentService
            .getCompanyPayments(
                companyId
            )
            .pipe(
                finalize(
                    () =>
                        this.paymentsLoading.set(false)
                )
            )
            .subscribe({

                next: (response) => {

                    this.payments.set(
                        response.payments
                    );

                    this.paymentsLoaded.set(
                        true
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to load company payments:',
                        error
                    );


                    this.paymentErrorMessage.set(
                        error?.error?.message ||
                        'Company payments could not be loaded.'
                    );
                }
            });
    }


    // =====================================================
    // OPEN PAYMENT DETAILS
    // =====================================================

    openPaymentDetails(
        payment: Payment
    ): void {

        this.paymentErrorMessage.set(
            ''
        );

        this.paymentDetailsLoading.set(
            true
        );

        this.selectedPayment.set(
            payment
        );

        this.selectedPaymentSession.set(
            null
        );


        this.paymentService
            .getCompanyPayment(
                this.companyId(),
                payment.id
            )
            .pipe(
                finalize(
                    () =>
                        this.paymentDetailsLoading.set(false)
                )
            )
            .subscribe({

                next: (response) => {

                    this.selectedPayment.set(
                        response.payment
                    );

                    this.selectedPaymentSession.set(
                        response.session
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to load payment details:',
                        error
                    );


                    this.paymentErrorMessage.set(
                        error?.error?.message ||
                        'Payment details could not be loaded.'
                    );


                    this.selectedPayment.set(
                        null
                    );

                    this.selectedPaymentSession.set(
                        null
                    );
                }
            });
    }


    // =====================================================
    // CLOSE PAYMENT DETAILS
    // =====================================================

    closePaymentDetails(): void {

        if (
            this.paymentDetailsLoading()
        ) {
            return;
        }


        this.selectedPayment.set(
            null
        );

        this.selectedPaymentSession.set(
            null
        );
    }


    // =====================================================
    // PAYMENT DISPLAY HELPERS
    // =====================================================

    paymentAmount(
        payment: Payment
    ): string {

        return Number(
            payment.amount
        ).toLocaleString(
            'en-TZ',
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        );
    }


    formatMoney(
        amount: number | string
    ): string {

        return Number(
            amount
        ).toLocaleString(
            'en-TZ',
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        );
    }


    paymentStatusLabel(
        payment: Payment
    ): string {

        if (
            payment.status ===
            'successful'
        ) {
            return 'Successful';
        }


        if (
            payment.status ===
            'pending'
        ) {
            return 'Pending';
        }


        if (
            payment.status ===
            'failed'
        ) {
            return 'Failed';
        }


        return payment.status;
    }


    paymentStatusClass(
        payment: Payment
    ): string {

        if (
            payment.status ===
            'successful'
        ) {
            return 'status--active';
        }


        if (
            payment.status ===
            'pending'
        ) {
            return 'status--pending';
        }


        return 'status--suspended';
    }


    paymentMethodLabel(
        method: string
    ): string {

        if (!method) {
            return '—';
        }


        return method
            .replace(
                /[_-]+/g,
                ' '
            )
            .replace(
                /\b\w/g,
                (character) =>
                    character.toUpperCase()
            );
    }


    sessionStatusLabel(
        session:
            PaymentInternetSession | null
    ): string {

        if (
            !session ||
            !session.status
        ) {
            return 'No session';
        }


        return this.humanizeStatus(
            String(session.status)
        );
    }


    // =====================================================
    // LOAD COMPANY SESSIONS
    // =====================================================

    loadSessions(): void {

        const companyId =
            this.companyId();


        if (
            !Number.isInteger(companyId) ||
            companyId <= 0
        ) {
            return;
        }


        this.sessionsLoading.set(
            true
        );

        this.sessionErrorMessage.set(
            ''
        );


        this.sessionService
            .getCompanySessions(
                companyId
            )
            .pipe(
                finalize(
                    () =>
                        this.sessionsLoading.set(false)
                )
            )
            .subscribe({

                next: (response) => {

                    this.sessions.set(
                        response.sessions
                    );

                    this.sessionsLoaded.set(
                        true
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to load company sessions:',
                        error
                    );


                    this.sessionErrorMessage.set(
                        error?.error?.message ||
                        'Company internet sessions could not be loaded.'
                    );
                }
            });
    }


    // =====================================================
    // OPEN SESSION DETAILS
    // =====================================================

    openSessionDetails(
        session: InternetSession
    ): void {

        this.sessionErrorMessage.set(
            ''
        );

        this.sessionDetailsLoading.set(
            true
        );

        this.selectedSession.set(
            session
        );


        this.sessionService
            .getCompanySession(
                this.companyId(),
                session.id
            )
            .pipe(
                finalize(
                    () =>
                        this.sessionDetailsLoading.set(false)
                )
            )
            .subscribe({

                next: (response) => {

                    this.selectedSession.set(
                        response.session
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to load session details:',
                        error
                    );


                    this.sessionErrorMessage.set(
                        error?.error?.message ||
                        'Internet session details could not be loaded.'
                    );


                    this.selectedSession.set(
                        null
                    );
                }
            });
    }


    // =====================================================
    // CLOSE SESSION DETAILS
    // =====================================================

    closeSessionDetails(): void {

        if (
            this.sessionDetailsLoading() ||
            this.sessionActionId() !== null
        ) {
            return;
        }


        this.selectedSession.set(
            null
        );
    }


    // =====================================================
    // CHANGE SESSION STATUS
    // =====================================================

    async changeSessionStatus(
        session: InternetSession,
        status: SessionStatus
    ): Promise<void> {

        if (
            session.status === status
        ) {
            return;
        }


        const actionLabel =
            this.sessionActionLabel(
                status
            );


        const confirmed =
            await this.ui.confirm(
                `${actionLabel} session?`,
                `Session #${session.id} will be changed from ${this.sessionStatusText(session.status)} to ${this.sessionStatusText(status)}.`,
                actionLabel
            );


        if (!confirmed) {
            return;
        }


        this.sessionActionId.set(
            session.id
        );

        this.sessionErrorMessage.set(
            ''
        );


        this.sessionService
            .changeCompanySessionStatus(
                this.companyId(),
                session.id,
                status
            )
            .pipe(
                finalize(
                    () =>
                        this.sessionActionId.set(null)
                )
            )
            .subscribe({

                next: (response) => {

                    /*
                     * The PATCH endpoint returns only the core
                     * session fields. Merge them with the existing
                     * joined package/payment fields instead of
                     * replacing the whole object.
                     */
                    this.replaceSession(
                        response.session
                    );


                    const selected =
                        this.selectedSession();


                    if (
                        selected &&
                        selected.id ===
                        response.session.id
                    ) {

                        this.selectedSession.set({
                            ...selected,
                            ...response.session
                        });
                    }
                },


                error: (error) => {

                    console.error(
                        'Failed to update internet session status:',
                        error
                    );


                    this.sessionErrorMessage.set(
                        error?.error?.message ||
                        'The internet session status could not be updated.'
                    );
                }
            });
    }


    // =====================================================
    // SESSION DISPLAY HELPERS
    // =====================================================

    internetSessionStatusLabel(
        session: InternetSession
    ): string {

        return this.sessionStatusText(
            session.status
        );
    }


    internetSessionStatusClass(
        session: InternetSession
    ): string {

        if (
            session.status ===
            'active'
        ) {
            return 'status--active';
        }


        if (
            session.status ===
            'pending_activation'
        ) {
            return 'status--pending';
        }


        if (
            session.status ===
            'expired'
        ) {
            return 'status--expired';
        }


        return 'status--suspended';
    }


    sessionStatusText(
        status: SessionStatus
    ): string {

        return this.humanizeStatus(
            status
        );
    }


    sessionAmount(
        session: InternetSession
    ): string {

        if (
            session.amount === undefined ||
            session.amount === null
        ) {
            return '—';
        }


        return Number(
            session.amount
        ).toLocaleString(
            'en-TZ',
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        );
    }


    sessionDuration(
        session: InternetSession
    ): string {

        if (
            session.duration_minutes === undefined
        ) {
            return '—';
        }


        return this.packageDuration(
            session.duration_minutes
        );
    }


    sessionRemainingLabel(
        session: InternetSession
    ): string {

        if (
            session.status ===
            'expired'
        ) {
            return 'Expired';
        }


        if (!session.expires_at) {
            return '—';
        }


        const expiresAt =
            new Date(
                session.expires_at
            ).getTime();


        if (
            Number.isNaN(expiresAt)
        ) {
            return '—';
        }


        const difference =
            expiresAt -
            Date.now();


        if (
            difference <= 0
        ) {
            return 'Expired';
        }


        const totalMinutes =
            Math.ceil(
                difference /
                60000
            );


        if (
            totalMinutes >= 1440
        ) {

            const days =
                Math.floor(
                    totalMinutes /
                    1440
                );


            const hours =
                Math.floor(
                    (
                        totalMinutes %
                        1440
                    ) /
                    60
                );


            return hours > 0
                ? `${days}d ${hours}h remaining`
                : `${days}d remaining`;
        }


        if (
            totalMinutes >= 60
        ) {

            const hours =
                Math.floor(
                    totalMinutes /
                    60
                );


            const minutes =
                totalMinutes %
                60;


            return minutes > 0
                ? `${hours}h ${minutes}m remaining`
                : `${hours}h remaining`;
        }


        return `${totalMinutes}m remaining`;
    }


    sessionCanActivate(
        session: InternetSession
    ): boolean {

        return (
            session.status !== 'active' &&
            session.status !== 'expired'
        );
    }


    sessionCanSuspend(
        session: InternetSession
    ): boolean {

        return (
            session.status === 'active' ||
            session.status ===
                'pending_activation'
        );
    }


    // =====================================================
    // LOAD COMPANY REPORTS
    // =====================================================

    loadReports(): void {

        const companyId =
            this.companyId();


        if (
            !Number.isInteger(companyId) ||
            companyId <= 0
        ) {
            return;
        }


        this.reportsLoading.set(
            true
        );

        this.reportErrorMessage.set(
            ''
        );


        this.reportService
            .getCompanyReports(
                companyId
            )
            .pipe(
                finalize(
                    () =>
                        this.reportsLoading.set(false)
                )
            )
            .subscribe({

                next: (response) => {

                    this.reportTotalRevenue.set(
                        Number(
                            response.revenue.total_revenue
                        )
                    );


                    this.revenueReport.set(
                        response.revenue.report
                    );


                    this.paymentReport.set(
                        response.payments.report
                    );


                    this.sessionReport.set(
                        response.sessions.report
                    );


                    this.reportsLoaded.set(
                        true
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to load company reports:',
                        error
                    );


                    this.reportErrorMessage.set(
                        error?.error?.message ||
                        'Company reports could not be loaded.'
                    );
                }
            });
    }


    // =====================================================
    // REPORT DISPLAY HELPERS
    // =====================================================

    reportStatusLabel(
        status: string
    ): string {

        return this.humanizeStatus(
            status
        );
    }


    reportStatusClass(
        status: string
    ): string {

        if (
            status === 'successful' ||
            status === 'active'
        ) {
            return 'status--active';
        }


        if (
            status === 'pending' ||
            status === 'pending_activation'
        ) {
            return 'status--pending';
        }


        if (
            status === 'expired'
        ) {
            return 'status--expired';
        }


        return 'status--suspended';
    }


    reportRevenueAmount(
        amount: number | string
    ): string {

        return this.formatMoney(
            amount
        );
    }


    reportPaymentAmount(
        item: CompanyPaymentReportItem
    ): string {

        return this.formatMoney(
            item.total_amount
        );
    }


    // =====================================================
    // SAVE COMPANY BRANDING
    // =====================================================

    saveBranding(): void {

        const company =
            this.company();


        if (!company) {
            return;
        }


        this.brandingErrorMessage.set('');
        this.brandingSuccessMessage.set('');


        if (
            this.brandingForm.invalid
        ) {

            this.brandingForm.markAllAsTouched();

            return;
        }


        const raw =
            this.brandingForm.getRawValue();


        const payload:
            UpdateCompanyBrandingRequest = {

            branding: {

                primary_color:
                    raw.primary_color.trim(),

                secondary_color:
                    raw.secondary_color.trim(),

                accent_color:
                    raw.accent_color.trim(),

                background_color:
                    raw.background_color.trim(),

                navbar_color:
                    raw.navbar_color.trim(),

                background_image_url:
                    raw.background_image_url.trim() ||
                    null,

                login_image_url:
                    raw.login_image_url.trim() ||
                    null,

                banner_image_url:
                    raw.banner_image_url.trim() ||
                    null
            }
        };


        this.brandingSaving.set(true);


        this.companyService
            .updateCompanyBranding(
                company.id,
                payload
            )
            .pipe(
                finalize(
                    () =>
                        this.brandingSaving.set(false)
                )
            )
            .subscribe({

                next: (response) => {

                    this.company.set(
                        response.company
                    );

                    this.populateBrandingForm(
                        response.company
                    );

                    this.brandingSuccessMessage.set(
                        response.message ||
                        'Company branding saved successfully.'
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to update company branding:',
                        error
                    );

                    this.brandingErrorMessage.set(
                        error?.error?.message ||
                        'Company branding could not be updated.'
                    );
                }
            });
    }


    // =====================================================
    // RESET BRANDING FORM
    // =====================================================

    resetBrandingForm(): void {

        const company =
            this.company();


        if (!company) {
            return;
        }


        this.brandingErrorMessage.set('');
        this.brandingSuccessMessage.set('');

        this.populateBrandingForm(
            company
        );
    }


    // =====================================================
    // BRANDING FILE SELECTION
    // =====================================================

    onLogoFileSelected(
        event: Event
    ): void {

        const file =
            this.extractSelectedFile(
                event
            );


        if (!file) {
            return;
        }


        this.uploadLogo(
            file
        );
    }


    onBrandingFileSelected(
        event: Event,
        imageType:
            CompanyBrandingImageType
    ): void {

        const file =
            this.extractSelectedFile(
                event
            );


        if (!file) {
            return;
        }


        this.uploadBrandingImage(
            imageType,
            file
        );
    }


    // =====================================================
    // UPLOAD LOGO
    // =====================================================

    uploadLogo(
        file: File
    ): void {

        const validationMessage =
            this.validateImageFile(
                file
            );


        if (validationMessage) {

            this.brandingErrorMessage.set(
                validationMessage
            );

            return;
        }


        this.brandingUploading.set(
            'logo'
        );

        this.brandingErrorMessage.set('');
        this.brandingSuccessMessage.set('');


        this.companyService
            .uploadCompanyLogo(
                this.companyId(),
                file
            )
            .pipe(
                finalize(
                    () =>
                        this.brandingUploading.set(null)
                )
            )
            .subscribe({

                next: (response) => {

                    if (response.company) {

                        this.company.set(
                            response.company
                        );

                        this.populateBrandingForm(
                            response.company
                        );
                    }


                    this.brandingSuccessMessage.set(
                        response.message ||
                        'Company logo uploaded successfully.'
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to upload company logo:',
                        error
                    );

                    this.brandingErrorMessage.set(
                        error?.error?.message ||
                        'Company logo could not be uploaded.'
                    );
                }
            });
    }


    // =====================================================
    // REMOVE LOGO
    // =====================================================

    async removeLogo():
        Promise<void> {

        const company =
            this.company();


        if (
            !company ||
            !company.logo_url
        ) {
            return;
        }


        const confirmed =
            await this.ui.confirm(
                'Remove company logo?',
                'The current logo will be removed from this company.',
                'Remove'
            );


        if (!confirmed) {
            return;
        }


        this.brandingRemoving.set(
            'logo'
        );

        this.brandingErrorMessage.set('');
        this.brandingSuccessMessage.set('');


        this.companyService
            .removeCompanyLogo(
                company.id
            )
            .pipe(
                finalize(
                    () =>
                        this.brandingRemoving.set(null)
                )
            )
            .subscribe({

                next: (response) => {

                    this.company.set(
                        response.company
                    );

                    this.populateBrandingForm(
                        response.company
                    );

                    this.brandingSuccessMessage.set(
                        response.message ||
                        'Company logo removed successfully.'
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to remove company logo:',
                        error
                    );

                    this.brandingErrorMessage.set(
                        error?.error?.message ||
                        'Company logo could not be removed.'
                    );
                }
            });
    }


    // =====================================================
    // UPLOAD BRANDING IMAGE
    // =====================================================

    uploadBrandingImage(
        imageType:
            CompanyBrandingImageType,
        file: File
    ): void {

        const validationMessage =
            this.validateImageFile(
                file
            );


        if (validationMessage) {

            this.brandingErrorMessage.set(
                validationMessage
            );

            return;
        }


        this.brandingUploading.set(
            imageType
        );

        this.brandingErrorMessage.set('');
        this.brandingSuccessMessage.set('');


        this.companyService
            .uploadCompanyBrandingImage(
                this.companyId(),
                imageType,
                file
            )
            .pipe(
                finalize(
                    () =>
                        this.brandingUploading.set(null)
                )
            )
            .subscribe({

                next: (response) => {

                    if (response.company) {

                        this.company.set(
                            response.company
                        );

                        this.populateBrandingForm(
                            response.company
                        );
                    }


                    this.brandingSuccessMessage.set(
                        response.message ||
                        `${this.brandingImageLabel(imageType)} uploaded successfully.`
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to upload branding image:',
                        error
                    );

                    this.brandingErrorMessage.set(
                        error?.error?.message ||
                        `${this.brandingImageLabel(imageType)} could not be uploaded.`
                    );
                }
            });
    }


    // =====================================================
    // REMOVE BRANDING IMAGE
    // =====================================================

    async removeBrandingImage(
        imageType:
            CompanyBrandingImageType
    ): Promise<void> {

        const company =
            this.company();


        if (!company) {
            return;
        }


        const currentUrl =
            this.getBrandingImageUrl(
                imageType
            );


        if (!currentUrl) {
            return;
        }


        const label =
            this.brandingImageLabel(
                imageType
            );


        const confirmed =
            await this.ui.confirm(
                `Remove ${label.toLowerCase()}?`,
                `The current ${label.toLowerCase()} will be removed from this company.`,
                'Remove'
            );


        if (!confirmed) {
            return;
        }


        this.brandingRemoving.set(
            imageType
        );

        this.brandingErrorMessage.set('');
        this.brandingSuccessMessage.set('');


        this.companyService
            .removeCompanyBrandingImage(
                company.id,
                imageType
            )
            .pipe(
                finalize(
                    () =>
                        this.brandingRemoving.set(null)
                )
            )
            .subscribe({

                next: (response) => {

                    this.company.set(
                        response.company
                    );

                    this.populateBrandingForm(
                        response.company
                    );

                    this.brandingSuccessMessage.set(
                        response.message ||
                        `${label} removed successfully.`
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to remove branding image:',
                        error
                    );

                    this.brandingErrorMessage.set(
                        error?.error?.message ||
                        `${label} could not be removed.`
                    );
                }
            });
    }


    // =====================================================
    // BRANDING DISPLAY HELPERS
    // =====================================================

    brandingImageLabel(
        imageType:
            CompanyBrandingImageType
    ): string {

        if (
            imageType === 'background'
        ) {
            return 'Background image';
        }


        if (
            imageType === 'login'
        ) {
            return 'Login image';
        }


        return 'Banner image';
    }


    getBrandingImageUrl(
        imageType:
            CompanyBrandingImageType
    ): string | null {

        if (
            imageType === 'background'
        ) {
            return this.backgroundImageUrl();
        }


        if (
            imageType === 'login'
        ) {
            return this.loginImageUrl();
        }


        return this.bannerImageUrl();
    }


    publicImageUrl(
        value:
            string |
            null |
            undefined
    ): string {

        if (!value) {
            return '';
        }


        if (
            value.startsWith('http://') ||
            value.startsWith('https://') ||
            value.startsWith('data:') ||
            value.startsWith('blob:')
        ) {
            return value;
        }


        return `http://localhost:4000${value}`;
    }


    // =====================================================
    // BACK TO COMPANIES
    // =====================================================

    goBack(): void {

        void this.router.navigate(
            [
                '/platform',
                'companies'
            ]
        );
    }


    // =====================================================
    // COMPANY STATUS HELPERS
    // =====================================================

    statusLabel(): string {

        const company =
            this.company();


        if (!company) {
            return '';
        }


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


    statusClass(): string {

        const company =
            this.company();


        return company?.status ===
            'active'
                ? 'status--active'
                : 'status--suspended';
    }


    // =====================================================
    // PRIVATE ADMIN HELPER
    // =====================================================

    private replaceAdmin(
        updatedAdmin: Admin
    ): void {

        this.admins.update(
            (admins) =>
                admins.map(
                    (admin) => {

                        if (
                            admin.id !==
                            updatedAdmin.id
                        ) {
                            return admin;
                        }


                        return {
                            ...admin,
                            ...updatedAdmin
                        };
                    }
                )
        );
    }


    // =====================================================
    // PRIVATE PACKAGE HELPERS
    // =====================================================

    private replacePackage(
        updatedPackage: InternetPackage
    ): void {

        this.packages.update(
            (packages) =>
                packages.map(
                    (item) => {

                        if (
                            item.id !==
                            updatedPackage.id
                        ) {
                            return item;
                        }


                        return {
                            ...item,
                            ...updatedPackage
                        };
                    }
                )
        );
    }


    private sortPackages(): void {

        this.packages.update(
            (packages) =>
                [...packages]
                    .sort(
                        (a, b) =>
                            Number(a.price) -
                            Number(b.price)
                    )
        );
    }


    // =====================================================
    // PRIVATE SESSION HELPERS
    // =====================================================

    private replaceSession(
        updatedSession: InternetSession
    ): void {

        this.sessions.update(
            (sessions) =>
                sessions.map(
                    (session) => {

                        if (
                            session.id !==
                            updatedSession.id
                        ) {
                            return session;
                        }


                        return {
                            ...session,
                            ...updatedSession
                        };
                    }
                )
        );
    }


    private sessionActionLabel(
        status: SessionStatus
    ): string {

        if (
            status ===
            'active'
        ) {
            return 'Activate';
        }


        if (
            status ===
            'suspended'
        ) {
            return 'Suspend';
        }


        if (
            status ===
            'expired'
        ) {
            return 'Expire';
        }


        if (
            status ===
            'failed'
        ) {
            return 'Mark failed';
        }


        return 'Set pending';
    }


    private humanizeStatus(
        status: string
    ): string {

        if (!status) {
            return '—';
        }


        return status
            .replace(
                /[_-]+/g,
                ' '
            )
            .replace(
                /\b\w/g,
                (character) =>
                    character.toUpperCase()
            );
    }


    private toDateTimeLocal(
        value: string | null
    ): string {

        if (!value) {
            return '';
        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return '';
        }


        const localDate =
            new Date(
                date.getTime() -
                date.getTimezoneOffset() *
                60000
            );


        return localDate
            .toISOString()
            .slice(
                0,
                16
            );
    }


    // =====================================================
    // PRIVATE BRANDING HELPERS
    // =====================================================

    private populateBrandingForm(
        company: Company
    ): void {

        const branding =
            company.settings
                ?.branding;


        this.brandingForm.setValue({

            primary_color:
                branding?.primary_color ||
                '#2563EB',

            secondary_color:
                branding?.secondary_color ||
                '#111827',

            accent_color:
                branding?.accent_color ||
                '#22C55E',

            background_color:
                branding?.background_color ||
                '#F8FAFC',

            navbar_color:
                branding?.navbar_color ||
                '#FFFFFF',

            background_image_url:
                branding?.background_image_url ??
                '',

            login_image_url:
                branding?.login_image_url ??
                '',

            banner_image_url:
                branding?.banner_image_url ??
                ''
        });
    }


    private extractSelectedFile(
        event: Event
    ): File | null {

        const input =
            event.target as
                HTMLInputElement | null;


        if (
            !input ||
            !input.files ||
            input.files.length === 0
        ) {
            return null;
        }


        const file =
            input.files[0];


        input.value =
            '';


        return file;
    }


    private validateImageFile(
        file: File
    ): string | null {

        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp'
        ];


        if (
            !allowedTypes.includes(
                file.type
            )
        ) {

            return 'Only JPG, PNG, and WEBP images are allowed.';
        }


        if (
            file.size >
            5 * 1024 * 1024
        ) {

            return 'Images must be 5 MB or smaller.';
        }


        return null;
    }


    // =====================================================
    // PRIVATE COMPANY FORM HELPER
    // =====================================================

    private populateForm(
        company: Company
    ): void {

        this.companyForm.setValue({

            name:
                company.name,

            slug:
                company.slug,

            email:
                company.email ?? '',

            phone:
                company.phone ?? '',

            address:
                company.address ?? ''
        });
    }
}