import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    signal
} from '@angular/core';

import {
    DatePipe
} from '@angular/common';

import {
    RouterLink
} from '@angular/router';

import {
    AlertController,
    IonButton,
    IonIcon,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    ToastController
} from '@ionic/angular/standalone';

import {
    addIcons
} from 'ionicons';

import {
    cardOutline,
    cashOutline,
    chevronForwardOutline,
    checkmarkCircleOutline,
    downloadOutline,
    refreshOutline,
    searchOutline
} from 'ionicons/icons';

import {
    finalize
} from 'rxjs';

import {
    Payment,
    PaymentStatus
} from '../../models/payment.model';

import {
    PaymentService
} from '../../services/payment.service';


/* =========================================================
   ADMIN PAYMENT PAGE
   ========================================================= */

@Component({
    selector: 'app-payments',

    standalone: true,

    imports: [
        DatePipe,
        RouterLink,
        IonButton,
        IonIcon,
        IonInput,
        IonSelect,
        IonSelectOption,
        IonSpinner
    ],

    templateUrl:
        './payments.page.html',

    styleUrl:
        './payments.page.scss',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})
export class PaymentsPage {

    // =====================================================
    // SERVICES
    // =====================================================

    private readonly service =
        inject(PaymentService);

    private readonly alertController =
        inject(AlertController);

    private readonly toastController =
        inject(ToastController);


    // =====================================================
    // PAYMENT HISTORY STATE
    // =====================================================

    readonly payments =
        signal<Payment[]>([]);

    readonly loading =
        signal(true);

    readonly error =
        signal(false);

    readonly query =
        signal('');

    readonly status =
        signal('all');

    readonly method =
        signal('all');


    // =====================================================
    // CASH PAYMENT REQUEST STATE
    // =====================================================

    readonly cashRequests =
        signal<Payment[]>([]);

    readonly cashLoading =
        signal(false);

    readonly cashError =
        signal(false);

    readonly cashLoaded =
        signal(false);

    readonly confirmingReference =
        signal<string | null>(
            null
        );


    // =====================================================
    // ACTIVE PAGE VIEW
    // =====================================================

    readonly activeView =
        signal<'all' | 'cash'>(
            'all'
        );


    // =====================================================
    // PAYMENT METHOD FILTER OPTIONS
    // =====================================================

    readonly methods =
        computed(() => {

            return [
                ...new Set(
                    this.payments()
                        .map(
                            (payment) =>
                                payment.payment_method
                        )
                        .filter(
                            (
                                value
                            ): value is string =>
                                Boolean(value)
                        )
                )
            ];
        });


    // =====================================================
    // FILTERED PAYMENT HISTORY
    // =====================================================

    readonly filtered =
        computed(() => {

            const query =
                this.query()
                    .toLowerCase()
                    .trim();

            const status =
                this.status();

            const method =
                this.method();


            return this.payments()
                .filter(
                    (payment) => {

                        const searchableText =
                            [
                                payment.transaction_reference,
                                payment.phone_number,
                                payment.payment_method,
                                payment.status,
                                payment.package_name
                            ]
                                .filter(Boolean)
                                .join(' ')
                                .toLowerCase();


                        const matchesQuery =
                            !query ||
                            searchableText.includes(
                                query
                            );


                        const matchesStatus =
                            status === 'all' ||
                            payment.status === status;


                        const matchesMethod =
                            method === 'all' ||
                            payment.payment_method === method;


                        return (
                            matchesQuery &&
                            matchesStatus &&
                            matchesMethod
                        );
                    }
                );
        });


    // =====================================================
    // PAYMENT COUNTS
    // =====================================================

    readonly totalPayments =
        computed(
            () =>
                this.payments().length
        );


    readonly successfulPayments =
        computed(
            () =>
                this.payments()
                    .filter(
                        (payment) =>
                            payment.status ===
                            'successful'
                    )
                    .length
        );


    readonly pendingPayments =
        computed(
            () =>
                this.payments()
                    .filter(
                        (payment) =>
                            payment.status ===
                                'pending' ||
                            String(payment.status) ===
                                'awaiting_cash_confirmation'
                    )
                    .length
        );


    readonly failedPayments =
        computed(
            () =>
                this.payments()
                    .filter(
                        (payment) =>
                            payment.status ===
                            'failed'
                    )
                    .length
        );


    readonly successfulRevenue =
        computed(() => {

            return this.payments()
                .filter(
                    (payment) =>
                        payment.status ===
                        'successful'
                )
                .reduce(
                    (
                        total,
                        payment
                    ) =>
                        total +
                        Number(
                            payment.amount ?? 0
                        ),
                    0
                );
        });


    // =====================================================
    // CASH REQUEST COUNTS
    // =====================================================

    readonly pendingCashCount =
        computed(
            () =>
                this.cashRequests().length
        );


    readonly pendingCashAmount =
        computed(() => {

            return this.cashRequests()
                .reduce(
                    (
                        total,
                        request
                    ) =>
                        total +
                        Number(
                            request.amount ?? 0
                        ),
                    0
                );
        });


    // =====================================================
    // CONSTRUCTOR
    // =====================================================

    constructor() {

        addIcons({
            cardOutline,
            cashOutline,
            chevronForwardOutline,
            checkmarkCircleOutline,
            downloadOutline,
            refreshOutline,
            searchOutline
        });


        this.load();
    }


    // =====================================================
    // LOAD PAYMENT HISTORY
    // =====================================================

    load(): void {

        this.loading.set(
            true
        );

        this.error.set(
            false
        );


        this.service
            .getPayments()
            .pipe(
                finalize(
                    () =>
                        this.loading.set(
                            false
                        )
                )
            )
            .subscribe({

                next: (response) => {

                    this.payments.set(
                        response.payments ??
                        []
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to load payments:',
                        error
                    );

                    this.error.set(
                        true
                    );
                }
            });
    }


    // =====================================================
    // REFRESH CURRENT VIEW
    // =====================================================

    refreshCurrentView(): void {

        if (
            this.activeView() ===
            'cash'
        ) {

            this.loadCashRequests();

            return;
        }


        this.load();
    }


    // =====================================================
    // CHANGE PAGE VIEW
    // =====================================================

    changeView(
        view:
            'all' |
            'cash'
    ): void {

        this.activeView.set(
            view
        );


        if (
            view === 'cash' &&
            !this.cashLoaded()
        ) {

            this.loadCashRequests();
        }
    }


    // =====================================================
    // LOAD CASH PAYMENT REQUESTS
    // =====================================================

    loadCashRequests(): void {

        this.cashLoading.set(
            true
        );

        this.cashError.set(
            false
        );


        this.service
            .getCashRequests()
            .pipe(
                finalize(
                    () =>
                        this.cashLoading.set(
                            false
                        )
                )
            )
            .subscribe({

                next: (response) => {

                    this.cashRequests.set(
                        response.cash_requests ??
                        []
                    );

                    this.cashLoaded.set(
                        true
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to load cash requests:',
                        error
                    );

                    this.cashError.set(
                        true
                    );
                }
            });
    }


    // =====================================================
    // CONFIRM CASH PAYMENT
    // =====================================================

    async confirmCash(
        request: Payment
    ): Promise<void> {

        const reference =
            request
                .transaction_reference
                ?.trim();


        if (!reference) {

            await this.showToast(
                'This cash request does not have a valid payment reference.',
                'danger'
            );

            return;
        }


        if (
            request.payment_method !==
            'cash'
        ) {

            await this.showToast(
                'Only cash payments can be confirmed here.',
                'danger'
            );

            return;
        }


        if (
            request.status !==
            ('awaiting_cash_confirmation' as PaymentStatus)
        ) {

            await this.showToast(
                'This cash payment is no longer waiting for confirmation.',
                'warning'
            );

            return;
        }


        if (
            this.confirmingReference() !==
            null
        ) {
            return;
        }


        const alert =
            await this.alertController
                .create({

                    header:
                        'Confirm Cash Payment',

                    subHeader:
                        request.package_name ||
                        'Internet package',

                    message:
                        `Confirm that you physically received ${this.money(request.amount)} from ${request.phone_number || 'this customer'}. Internet access will be activated immediately after confirmation.`,

                    buttons: [

                        {
                            text:
                                'Cancel',

                            role:
                                'cancel'
                        },

                        {
                            text:
                                'Confirm Payment',

                            role:
                                'confirm',

                            handler:
                                () => {

                                    this.performCashConfirmation(
                                        reference
                                    );
                                }
                        }
                    ]
                });


        await alert.present();
    }


    // =====================================================
    // PERFORM CASH CONFIRMATION
    // =====================================================

    private performCashConfirmation(
        reference: string
    ): void {

        if (
            this.confirmingReference() !==
            null
        ) {
            return;
        }


        this.confirmingReference.set(
            reference
        );


        this.service
            .confirmCashPayment(
                reference
            )
            .pipe(
                finalize(
                    () =>
                        this.confirmingReference.set(
                            null
                        )
                )
            )
            .subscribe({

                next: async (
                    response
                ) => {

                    /*
                     * Immediately remove the request from
                     * the pending cash list.
                     */
                    this.cashRequests.update(
                        (requests) =>
                            requests.filter(
                                (request) =>
                                    request.transaction_reference !==
                                    reference
                            )
                    );


                    /*
                     * Replace the corresponding payment in
                     * payment history when it already exists.
                     */
                    this.payments.update(
                        (payments) => {

                            const exists =
                                payments.some(
                                    (payment) =>
                                        payment.id ===
                                        response.payment.id
                                );


                            if (!exists) {

                                return [
                                    response.payment,
                                    ...payments
                                ];
                            }


                            return payments.map(
                                (payment) =>
                                    payment.id ===
                                    response.payment.id
                                        ? {
                                            ...payment,
                                            ...response.payment
                                        }
                                        : payment
                            );
                        }
                    );


                    await this.showToast(
                        response.already_confirmed
                            ? 'Cash payment was already confirmed.'
                            : 'Cash payment confirmed. Internet access is now active.',
                        'success'
                    );


                    /*
                     * Reload both backend views so our local
                     * state cannot become stale.
                     */
                    this.loadCashRequests();

                    this.load();
                },


                error: async (
                    error
                ) => {

                    console.error(
                        'Cash confirmation failed:',
                        error
                    );


                    await this.showToast(
                        error?.error?.message ||
                        'Unable to confirm this cash payment.',
                        'danger'
                    );


                    /*
                     * Reload pending requests because another
                     * admin may already have processed it.
                     */
                    this.loadCashRequests();
                }
            });
    }


    // =====================================================
    // CHECK WHETHER REQUEST IS BEING CONFIRMED
    // =====================================================

    isConfirming(
        request: Payment
    ): boolean {

        return (
            this.confirmingReference() ===
            request.transaction_reference
        );
    }


    // =====================================================
    // MONEY FORMATTER
    // =====================================================

    money(
        value:
            number |
            string |
            null |
            undefined
    ): string {

        if (
            value === null ||
            value === undefined ||
            value === ''
        ) {

            return 'TZS 0';
        }


        const amount =
            Number(
                value
            );


        if (
            Number.isNaN(
                amount
            )
        ) {

            return 'TZS 0';
        }


        return `TZS ${amount.toLocaleString(
            'en-TZ',
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        )}`;
    }


    // =====================================================
    // PAYMENT STATUS LABEL
    // =====================================================

    statusLabel(
        status:
            PaymentStatus
    ): string {

        if (
            status ===
            'successful'
        ) {

            return 'Successful';
        }


        if (
            status ===
            'pending'
        ) {

            return 'Pending';
        }


        if (
            status ===
            'failed'
        ) {

            return 'Failed';
        }


        if (
            status ===
            'awaiting_cash_confirmation'
        ) {

            return 'Awaiting Cash Confirmation';
        }


        return String(
            status
        )
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


    // =====================================================
    // PAYMENT METHOD LABEL
    // =====================================================

    methodLabel(
        method:
            string |
            null |
            undefined
    ): string {

        if (!method) {
            return '—';
        }


        if (
            method === 'cash'
        ) {
            return 'Cash';
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


    // =====================================================
    // STATUS CSS HELPER
    // =====================================================

    statusClass(
        status:
            PaymentStatus
    ): string {

        if (
            status ===
            'successful'
        ) {

            return 'status--successful';
        }


        if (
            status ===
                'pending'
        ) {

            return 'status--pending';
        }


        return 'status--failed';
    }


    // =====================================================
    // TOAST HELPER
    // =====================================================

    private async showToast(
        message: string,
        color:
            'success' |
            'danger' |
            'warning' |
            'primary' = 'primary'
    ): Promise<void> {

        const toast =
            await this.toastController
                .create({

                    message,

                    duration:
                        2500,

                    position:
                        'top',

                    color
                });


        await toast.present();
    }
}