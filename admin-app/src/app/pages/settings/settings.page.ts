import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    signal
} from '@angular/core';

import {
    ReactiveFormsModule,
    FormBuilder,
    Validators
} from '@angular/forms';

import {
    IonButton,
    IonIcon,
    IonInput,
    IonSpinner
} from '@ionic/angular/standalone';

import {
    addIcons
} from 'ionicons';

import {
    businessOutline,
    checkmarkCircleOutline,
    closeCircleOutline,
    cloudUploadOutline,
    colorPaletteOutline,
    imageOutline,
    logOutOutline,
    mailOutline,
    personOutline,
    refreshOutline,
    saveOutline,
    shieldCheckmarkOutline,
    trashOutline
} from 'ionicons/icons';

import {
    finalize
} from 'rxjs';

import {
    API_CONFIG
} from '../../config/api.config';

import {
    Company,
    CompanyBrandingImageType
} from '../../models/company.model';

import {
    AuthService
} from '../../services/auth.service';

import {
    CompanyService
} from '../../services/company.service';

import {
    UiService
} from '../../services/ui.service';


@Component({
    selector: 'app-settings',

    standalone: true,

    imports: [
        ReactiveFormsModule,
        IonButton,
        IonIcon,
        IonInput,
        IonSpinner
    ],

    templateUrl:
        './settings.page.html',

    styleUrl:
        './settings.page.scss',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})
export class SettingsPage {

    // =====================================================
    // SERVICES
    // =====================================================

    readonly auth =
        inject(AuthService);

    private readonly companyService =
        inject(CompanyService);

    private readonly ui =
        inject(UiService);

    private readonly fb =
        inject(FormBuilder);


    // =====================================================
    // STATE
    // =====================================================

    readonly loading =
        signal(true);

    readonly error =
        signal(false);

    readonly company =
        signal<Company | null>(null);

    readonly savingProfile =
        signal(false);

    readonly savingBranding =
        signal(false);

    readonly profileSuccess =
        signal('');

    readonly brandingSuccess =
        signal('');

    readonly formError =
        signal('');

    readonly uploadingLogo =
        signal(false);

    readonly removingLogo =
        signal(false);

    readonly uploadingImage =
        signal<CompanyBrandingImageType | null>(
            null
        );

    readonly removingImage =
        signal<CompanyBrandingImageType | null>(
            null
        );


    // =====================================================
    // ADMIN IDENTITY
    // =====================================================

    readonly initials =
        computed(() => {

            const name =
                this.auth.admin()
                    ?.name
                    ?.trim();

            if (!name) {
                return 'AD';
            }

            return name
                .split(/\s+/)
                .map(
                    (part) =>
                        part.charAt(0)
                )
                .slice(0, 2)
                .join('')
                .toUpperCase();
        });


    // =====================================================
    // COMPANY PROFILE FORM
    // =====================================================

    readonly profileForm =
        this.fb.nonNullable.group({

            name: [
                '',
                [
                    Validators.required,
                    Validators.minLength(2)
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
    // BRANDING FORM
    // =====================================================

    readonly brandingForm =
        this.fb.nonNullable.group({

            primary_color: [
                '#0f766e',
                [
                    Validators.pattern(
                        /^#[0-9A-Fa-f]{6}$/
                    )
                ]
            ],

            secondary_color: [
                '#172033',
                [
                    Validators.pattern(
                        /^#[0-9A-Fa-f]{6}$/
                    )
                ]
            ],

            accent_color: [
                '#0f766e',
                [
                    Validators.pattern(
                        /^#[0-9A-Fa-f]{6}$/
                    )
                ]
            ],

            background_color: [
                '#f8fafc',
                [
                    Validators.pattern(
                        /^#[0-9A-Fa-f]{6}$/
                    )
                ]
            ],

            navbar_color: [
                '#0f172a',
                [
                    Validators.pattern(
                        /^#[0-9A-Fa-f]{6}$/
                    )
                ]
            ]
        });


    // =====================================================
    // BRANDING IMAGES
    // =====================================================

    readonly logoUrl =
        computed(
            () =>
                this.company()
                    ?.logo_url ??
                null
        );


    readonly backgroundImageUrl =
        computed(
            () =>
                this.company()
                    ?.settings
                    ?.branding
                    ?.background_image_url ??
                null
        );


    readonly loginImageUrl =
        computed(
            () =>
                this.company()
                    ?.settings
                    ?.branding
                    ?.login_image_url ??
                null
        );


    readonly bannerImageUrl =
        computed(
            () =>
                this.company()
                    ?.settings
                    ?.branding
                    ?.banner_image_url ??
                null
        );


    // =====================================================
    // CONSTRUCTOR
    // =====================================================

    constructor() {

        addIcons({
            businessOutline,
            checkmarkCircleOutline,
            closeCircleOutline,
            cloudUploadOutline,
            colorPaletteOutline,
            imageOutline,
            logOutOutline,
            mailOutline,
            personOutline,
            refreshOutline,
            saveOutline,
            shieldCheckmarkOutline,
            trashOutline
        });

        this.load();
    }


    // =====================================================
    // LOAD SETTINGS
    // =====================================================

    load(): void {

        this.loading.set(true);
        this.error.set(false);
        this.formError.set('');


        this.auth
            .loadCurrentAdmin()
            .subscribe({
                error: () => {
                    // Company loading below is the main page state.
                }
            });


        this.companyService
            .loadCompany()
            .pipe(
                finalize(
                    () =>
                        this.loading.set(false)
                )
            )
            .subscribe({

                next: (response) => {

                    this.setCompany(
                        response.company
                    );
                },

                error: (error) => {

                    console.error(
                        'Failed to load company settings:',
                        error
                    );

                    this.error.set(true);
                }
            });
    }


    // =====================================================
    // COMPANY PROFILE
    // =====================================================

    saveProfile(): void {

        if (
            this.profileForm.invalid
        ) {

            this.profileForm
                .markAllAsTouched();

            return;
        }


        this.profileSuccess.set('');
        this.formError.set('');
        this.savingProfile.set(true);


        const value =
            this.profileForm.getRawValue();


        this.companyService
            .updateCurrentCompany({

                name:
                    value.name.trim(),

                email:
                    value.email.trim() ||
                    null,

                phone:
                    value.phone.trim() ||
                    null,

                address:
                    value.address.trim() ||
                    null
            })
            .pipe(
                finalize(
                    () =>
                        this.savingProfile.set(
                            false
                        )
                )
            )
            .subscribe({

                next: (response) => {

                    this.setCompany(
                        response.company
                    );

                    this.profileSuccess.set(
                        'Company profile saved successfully.'
                    );
                },

                error: (error) => {

                    console.error(
                        'Failed to save company profile:',
                        error
                    );

                    this.formError.set(
                        error?.error?.message ||
                        'Unable to save company profile.'
                    );
                }
            });
    }


    resetProfile(): void {

        const company =
            this.company();

        if (!company) {
            return;
        }

        this.populateProfileForm(
            company
        );

        this.profileSuccess.set('');
        this.formError.set('');
    }


    // =====================================================
    // BRAND COLORS
    // =====================================================

    saveBranding(): void {

        if (
            this.brandingForm.invalid
        ) {

            this.brandingForm
                .markAllAsTouched();

            return;
        }


        this.brandingSuccess.set('');
        this.formError.set('');
        this.savingBranding.set(true);


        const branding =
            this.brandingForm
                .getRawValue();


        this.companyService
            .updateCurrentCompanyBranding({
                branding: {
                    primary_color:
                        branding.primary_color,

                    secondary_color:
                        branding.secondary_color,

                    accent_color:
                        branding.accent_color,

                    background_color:
                        branding.background_color,

                    navbar_color:
                        branding.navbar_color
                }
            })
            .pipe(
                finalize(
                    () =>
                        this.savingBranding.set(
                            false
                        )
                )
            )
            .subscribe({

                next: (response) => {

                    this.setCompany(
                        response.company
                    );

                    this.brandingSuccess.set(
                        'Brand colors updated successfully.'
                    );
                },

                error: (error) => {

                    console.error(
                        'Failed to save branding:',
                        error
                    );

                    this.formError.set(
                        error?.error?.message ||
                        'Unable to save company branding.'
                    );
                }
            });
    }


    resetBranding(): void {

        const company =
            this.company();

        if (!company) {
            return;
        }

        this.populateBrandingForm(
            company
        );

        this.brandingSuccess.set('');
        this.formError.set('');
    }


    // =====================================================
    // LOGO
    // =====================================================

    onLogoSelected(
        event: Event
    ): void {

        const input =
            event.target as HTMLInputElement;

        const file =
            input.files?.[0];

        input.value = '';


        if (
            !file ||
            !this.validateImage(file)
        ) {
            return;
        }


        this.uploadingLogo.set(true);
        this.formError.set('');
        this.brandingSuccess.set('');


        this.companyService
            .uploadCurrentCompanyLogo(
                file
            )
            .pipe(
                finalize(
                    () =>
                        this.uploadingLogo.set(
                            false
                        )
                )
            )
            .subscribe({

                next: (response) => {

                    if (
                        response.company
                    ) {

                        this.setCompany(
                            response.company
                        );
                    }

                    this.brandingSuccess.set(
                        'Company logo uploaded successfully.'
                    );
                },

                error: (error) => {

                    console.error(
                        'Logo upload failed:',
                        error
                    );

                    this.formError.set(
                        error?.error?.message ||
                        'Unable to upload company logo.'
                    );
                }
            });
    }


    async removeLogo(): Promise<void> {

        if (
            !this.logoUrl()
        ) {
            return;
        }


        const confirmed =
            await this.ui.confirm(
                'Remove company logo?',
                'The customer portal and company admin area will stop displaying the current logo.',
                'Remove logo'
            );


        if (!confirmed) {
            return;
        }


        this.removingLogo.set(true);
        this.formError.set('');


        this.companyService
            .removeCurrentCompanyLogo()
            .pipe(
                finalize(
                    () =>
                        this.removingLogo.set(
                            false
                        )
                )
            )
            .subscribe({

                next: (response) => {

                    if (
                        response.company
                    ) {

                        this.setCompany(
                            response.company
                        );
                    }

                    this.brandingSuccess.set(
                        'Company logo removed.'
                    );
                },

                error: (error) => {

                    console.error(
                        'Logo removal failed:',
                        error
                    );

                    this.formError.set(
                        error?.error?.message ||
                        'Unable to remove company logo.'
                    );
                }
            });
    }


    // =====================================================
    // BRANDING IMAGES
    // =====================================================

    onBrandingFileSelected(
        event: Event,
        imageType:
            CompanyBrandingImageType
    ): void {

        const input =
            event.target as HTMLInputElement;

        const file =
            input.files?.[0];

        input.value = '';


        if (
            !file ||
            !this.validateImage(file)
        ) {
            return;
        }


        this.uploadingImage.set(
            imageType
        );

        this.formError.set('');
        this.brandingSuccess.set('');


        this.companyService
            .uploadCurrentCompanyBrandingImage(
                imageType,
                file
            )
            .pipe(
                finalize(
                    () =>
                        this.uploadingImage.set(
                            null
                        )
                )
            )
            .subscribe({

                next: (response) => {

                    if (
                        response.company
                    ) {

                        this.setCompany(
                            response.company
                        );
                    }

                    this.brandingSuccess.set(
                        `${this.imageTypeLabel(imageType)} uploaded successfully.`
                    );
                },

                error: (error) => {

                    console.error(
                        'Branding image upload failed:',
                        error
                    );

                    this.formError.set(
                        error?.error?.message ||
                        'Unable to upload branding image.'
                    );
                }
            });
    }


    async removeBrandingImage(
        imageType:
            CompanyBrandingImageType
    ): Promise<void> {

        const confirmed =
            await this.ui.confirm(
                `Remove ${this.imageTypeLabel(imageType).toLowerCase()}?`,
                'The image reference will be removed from your company branding.',
                'Remove image'
            );


        if (!confirmed) {
            return;
        }


        this.removingImage.set(
            imageType
        );

        this.formError.set('');


        this.companyService
            .removeCurrentCompanyBrandingImage(
                imageType
            )
            .pipe(
                finalize(
                    () =>
                        this.removingImage.set(
                            null
                        )
                )
            )
            .subscribe({

                next: (response) => {

                    if (
                        response.company
                    ) {

                        this.setCompany(
                            response.company
                        );
                    }

                    this.brandingSuccess.set(
                        `${this.imageTypeLabel(imageType)} removed.`
                    );
                },

                error: (error) => {

                    console.error(
                        'Branding image removal failed:',
                        error
                    );

                    this.formError.set(
                        error?.error?.message ||
                        'Unable to remove branding image.'
                    );
                }
            });
    }


    // =====================================================
    // HELPERS
    // =====================================================

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
            value.startsWith(
                'http://'
            ) ||
            value.startsWith(
                'https://'
            ) ||
            value.startsWith(
                'data:'
            ) ||
            value.startsWith(
                'blob:'
            )
        ) {
            return value;
        }


        return (
            `${API_CONFIG.backendUrl}` +
            (
                value.startsWith('/')
                    ? value
                    : `/${value}`
            )
        );
    }


    imageTypeLabel(
        imageType:
            CompanyBrandingImageType
    ): string {

        switch (
            imageType
        ) {

            case 'background':
                return 'Background image';

            case 'login':
                return 'Login image';

            case 'banner':
                return 'Banner image';

            default:
                return 'Branding image';
        }
    }


    private validateImage(
        file: File
    ): boolean {

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

            this.formError.set(
                'Only JPG, PNG, and WEBP images are allowed.'
            );

            return false;
        }


        const maxSize =
            5 *
            1024 *
            1024;


        if (
            file.size >
            maxSize
        ) {

            this.formError.set(
                'Image size must not exceed 5 MB.'
            );

            return false;
        }


        return true;
    }


    private setCompany(
        company: Company
    ): void {

        this.company.set(
            company
        );

        this.populateProfileForm(
            company
        );

        this.populateBrandingForm(
            company
        );
    }


    private populateProfileForm(
        company: Company
    ): void {

        this.profileForm.reset({

            name:
                company.name ??
                '',

            email:
                company.email ??
                '',

            phone:
                company.phone ??
                '',

            address:
                company.address ??
                ''
        });
    }


    private populateBrandingForm(
        company: Company
    ): void {

        const branding =
            company.settings
                ?.branding ??
            {};


        this.brandingForm.reset({

            primary_color:
                branding.primary_color ??
                '#0f766e',

            secondary_color:
                branding.secondary_color ??
                '#172033',

            accent_color:
                branding.accent_color ??
                '#0f766e',

            background_color:
                branding.background_color ??
                '#f8fafc',

            navbar_color:
                branding.navbar_color ??
                '#0f172a'
        });
    }


    // =====================================================
    // LOGOUT
    // =====================================================

    async logout():
        Promise<void> {

        const confirmed =
            await this.ui.confirm(
                'Log out?',
                'Your current administrator session will end.',
                'Log out'
            );


        if (
            confirmed
        ) {
            this.auth.logout();
        }
    }
}