import {
    ChangeDetectionStrategy,
    Component,
    inject,
    signal
} from '@angular/core';

import {
    CommonModule
} from '@angular/common';

import {
    FormBuilder,
    ReactiveFormsModule,
    Validators
} from '@angular/forms';

import {
    ActivatedRoute,
    Router
} from '@angular/router';

import {
    IonButton,
    IonCheckbox,
    IonContent,
    IonIcon,
    IonInput,
    IonSpinner
} from '@ionic/angular/standalone';

import {
    addIcons
} from 'ionicons';

import {
    eyeOffOutline,
    eyeOutline,
    lockClosedOutline,
    mailOutline,
    radioOutline,
    shieldCheckmarkOutline
} from 'ionicons/icons';

import {
    finalize
} from 'rxjs';

import {
    AuthService
} from '../../services/auth.service';

import {
    CompanyService
} from '../../services/company.service';


@Component({
    selector: 'app-login',

    standalone: true,

    imports: [
        CommonModule,
        ReactiveFormsModule,
        IonButton,
        IonCheckbox,
        IonContent,
        IonIcon,
        IonInput,
        IonSpinner
    ],

    templateUrl:
        './login.page.html',

    styleUrl:
        './login.page.scss',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})
export class LoginPage {

    private readonly fb =
        inject(FormBuilder);

    private readonly auth =
        inject(AuthService);

    private readonly router =
        inject(Router);

    private readonly route =
        inject(ActivatedRoute);

    private readonly companyService =
        inject(CompanyService);


    readonly loading =
        signal(false);

    readonly showPassword =
        signal(false);

    readonly errorMessage =
        signal('');


    readonly form =
        this.fb.nonNullable.group({

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
                    Validators.minLength(6)
                ]
            ]
        });


    constructor() {

        addIcons({
            eyeOffOutline,
            eyeOutline,
            lockClosedOutline,
            mailOutline,
            radioOutline,
            shieldCheckmarkOutline
        });
    }


    // =====================================================
    // LOGIN
    // =====================================================

    submit(): void {

        this.errorMessage.set('');


        if (
            this.form.invalid
        ) {

            this.form.markAllAsTouched();

            return;
        }


        this.loading.set(true);


        this.auth
            .login(
                this.form.getRawValue()
            )
            .pipe(
                finalize(
                    () =>
                        this.loading.set(false)
                )
            )
            .subscribe({

                next: async (
                    response
                ) => {

                    const admin =
                        response.admin;


                    console.log(
                        'LOGIN RESPONSE ADMIN:',
                        admin
                    );

                    console.log(
                        'AUTH TOKEN:',
                        this.auth.token
                    );

                    console.log(
                        'AUTH STATE:',
                        this.auth.admin()
                    );


                    if (!admin) {

                        this.errorMessage.set(
                            'Login succeeded but administrator data was not returned.'
                        );

                        return;
                    }


                    // =========================================
                    // SUPERADMIN
                    // =========================================

                    if (
                        admin.role ===
                        'superadmin'
                    ) {

                        const navigated =
                            await this.router.navigateByUrl(
                                '/platform/dashboard',
                                {
                                    replaceUrl: true
                                }
                            );


                        console.log(
                            'SUPERADMIN NAVIGATION RESULT:',
                            navigated
                        );


                        if (!navigated) {

                            this.errorMessage.set(
                                'Login succeeded, but the platform dashboard could not be opened.'
                            );
                        }


                        return;
                    }


                    // =========================================
                    // COMPANY ADMIN
                    // =========================================

                    if (
                        admin.role ===
                        'admin'
                    ) {

                        /*
                         * Load company data before entering the
                         * admin area so company name and branding
                         * can be available to the shared layout.
                         */
                        this.companyService
                            .loadCompany()
                            .subscribe({

                                next: async () => {

                                    const navigated =
                                        await this.router.navigateByUrl(
                                            '/dashboard',
                                            {
                                                replaceUrl:
                                                    true
                                            }
                                        );


                                    console.log(
                                        'ADMIN NAVIGATION RESULT:',
                                        navigated
                                    );


                                    if (!navigated) {

                                        this.errorMessage.set(
                                            'Login succeeded, but the company dashboard could not be opened.'
                                        );
                                    }
                                },


                                error: async (
                                    error
                                ) => {

                                    console.error(
                                        'Company preload failed:',
                                        error
                                    );


                                    /*
                                     * Do not block login just
                                     * because company branding
                                     * failed to load.
                                     */
                                    const navigated =
                                        await this.router.navigateByUrl(
                                            '/dashboard',
                                            {
                                                replaceUrl:
                                                    true
                                            }
                                        );


                                    console.log(
                                        'ADMIN FALLBACK NAVIGATION RESULT:',
                                        navigated
                                    );
                                }
                            });


                        return;
                    }


                    // =========================================
                    // INVALID ROLE
                    // =========================================

                    console.error(
                        'Unsupported administrator role:',
                        admin.role
                    );


                    this.auth.logout(
                        false
                    );


                    this.errorMessage.set(
                        `Unsupported administrator role: ${admin.role || 'missing role'}`
                    );
                },


                error: (
                    error
                ) => {

                    console.error(
                        'LOGIN ERROR:',
                        error
                    );


                    this.errorMessage.set(
                        error?.error?.message ||
                        'Unable to sign in. Check your email and password, then try again.'
                    );
                }
            });
    }
}