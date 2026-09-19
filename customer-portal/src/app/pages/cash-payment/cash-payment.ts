import { SUBSCRIBER_PHONE_PATTERN, toInternationalPhone } from '../../shared/subscriber-phone';
import { SubscriberPhoneDirective } from '../../shared/subscriber-phone.directive';
import { WifiContextService } from '../../services/wifi-context.service';
import {
    Component,
    OnInit,
    inject,
    signal
} from '@angular/core';

import {
    ActivatedRoute,
    Router,
    RouterLink
} from '@angular/router';

import {
    FormControl,
    ReactiveFormsModule,
    Validators
} from '@angular/forms';

import {
    InternetPackage
} from '../../models/package.model';

import {
    PackageService
} from '../../services/package.service';

import {
    PaymentService
} from '../../services/payment.service';

import {
    TenantService
} from '../../services/tenant.service';


@Component({
    selector: 'app-cash-payment',

    standalone: true,

    imports: [
        SubscriberPhoneDirective,
        RouterLink,
        ReactiveFormsModule
    ],

    templateUrl: './cash-payment.html',

    styleUrl: './cash-payment.css'
})
export class CashPaymentPageComponent
    implements OnInit {

    private readonly wifiContextService = inject(WifiContextService);

    readonly packageItem =
        signal<InternetPackage | null>(
            null
        );


    readonly loading =
        signal(
            true
        );


    readonly submitting =
        signal(
            false
        );


    readonly errorMessage =
        signal(
            ''
        );


    readonly phoneNumber =
        new FormControl(
            '',
            [
                Validators.required,

                Validators.pattern(
                    SUBSCRIBER_PHONE_PATTERN
                )
            ]
        );


    private readonly route =
        inject(
            ActivatedRoute
        );


    private readonly router =
        inject(
            Router
        );


    readonly packageService =
        inject(
            PackageService
        );


    private readonly paymentService =
        inject(
            PaymentService
        );


    readonly tenantService =
        inject(
            TenantService
        );


    // =====================================================
    // PAGE INITIALIZATION
    // =====================================================

    ngOnInit(): void {

        const companySlug =
            this.route.snapshot.paramMap.get(
                'companySlug'
            );


        const packageId =
            Number(
                this.route.snapshot.paramMap.get(
                    'packageId'
                )
            );


        if (!companySlug) {

            this.errorMessage.set(
                'The Wi-Fi provider could not be identified.'
            );

            this.loading.set(
                false
            );

            return;
        }


        if (
            !Number.isInteger(
                packageId
            ) ||
            packageId <= 0
        ) {

            this.errorMessage.set(
                'The selected package is invalid. Please choose a package again.'
            );

            this.loading.set(
                false
            );

            return;
        }


        this.wifiContextService.capture(companySlug, this.route.snapshot.queryParamMap);

        this.tenantService
            .setCompanySlug(
                companySlug
            );


        this.tenantService
            .loadCompany(
                companySlug
            )
            .subscribe({

                next: () => {

                    this.loadPackage(
                        companySlug,
                        packageId
                    );
                },


                error: (
                    error
                ) => {

                    console.error(
                        'Failed to load company:',
                        error
                    );


                    this.errorMessage.set(
                        'This Wi-Fi provider is currently unavailable.'
                    );


                    this.loading.set(
                        false
                    );
                }
            });
    }


    // =====================================================
    // LOAD PACKAGE
    // =====================================================

    private loadPackage(
        companySlug: string,
        packageId: number
    ): void {

        this.packageService
            .getPackageById(
                companySlug,
                packageId
            )
            .subscribe({

                next: (
                    packageItem
                ) => {

                    if (
                        !packageItem
                    ) {

                        this.errorMessage.set(
                            'This package is no longer available.'
                        );


                        this.loading.set(
                            false
                        );


                        return;
                    }


                    this.packageItem.set(
                        packageItem
                    );


                    this.packageService
                        .selectPackage(
                            packageItem
                        );


                    this.loading.set(
                        false
                    );
                },


                error: (
                    error
                ) => {

                    console.error(
                        'Failed to load cash-payment package:',
                        error
                    );


                    this.errorMessage.set(
                        'The package could not be loaded. Please return and try again.'
                    );


                    this.loading.set(
                        false
                    );
                }
            });
    }


    // =====================================================
    // CREATE CASH PAYMENT REQUEST
    // =====================================================

    requestCashPayment(): void {




        this.phoneNumber
            .markAsTouched();


        const packageItem =
            this.packageItem();


        const companySlug =
            this.tenantService
                .companySlug();


        const wifi = companySlug ? this.wifiContextService.get(companySlug) : null;
        const { mac, ip, router, loginUrl } = wifi || {};

        if (
            this.phoneNumber.invalid ||
            !packageItem ||
            !companySlug ||
            this.submitting()
        ) {

            return;
        }


        if (
            !mac ||
            !ip ||
            !router ||
            !loginUrl
        ) {

            this.errorMessage.set(
                'Wi-Fi connection information is missing. Please reconnect to the Wi-Fi and open the captive portal again.'
            );


            return;
        }


        this.submitting.set(
            true
        );


        this.errorMessage.set(
            ''
        );


        const normalizedPhone =
            toInternationalPhone(
                this.phoneNumber.value!
            );


        this.paymentService
            .initiateCashPayment({

                package_id:
                    packageItem.id,

                phone_number:
                    normalizedPhone,

                mac,

                ip,

                router,

                login_url:
                    loginUrl

            })
            .subscribe({

                next: (
                    response
                ) => {

                    this.submitting.set(
                        false
                    );


                    const reference =
                        response.payment
                            ?.transaction_reference;


                    if (
                        !reference
                    ) {

                        this.errorMessage.set(
                            'The cash request did not return a payment reference.'
                        );


                        return;
                    }


                    void this.router.navigate(
                        [
                            '/',
                            companySlug,
                            'cash-payment-status',
                            reference
                        ],
                        {
                            queryParamsHandling:
                                'preserve'
                        }
                    );
                },


                error: (
                    error
                ) => {

                    console.error(
                        'Cash payment request failed:',
                        error
                    );


                    this.submitting.set(
                        false
                    );


                    this.errorMessage.set(
                        error?.error?.message ||
                        'Cash payment request could not be submitted. Please try again.'
                    );
                }
            });
    }


}