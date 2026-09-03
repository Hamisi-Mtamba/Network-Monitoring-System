import {
    ChangeDetectionStrategy,
    Component,
    inject,
    signal
} from '@angular/core';

import {
    DatePipe
} from '@angular/common';

import {
    ActivatedRoute,
    RouterLink
} from '@angular/router';

import {
    IonButton,
    IonIcon,
    IonSpinner
} from '@ionic/angular/standalone';

import {
    addIcons
} from 'ionicons';

import {
    arrowBackOutline,
    pauseCircleOutline,
    playCircleOutline,
    wifiOutline
} from 'ionicons/icons';

import {
    finalize
} from 'rxjs';

import {
    InternetSession
} from '../../models/session.model';

import {
    SessionService
} from '../../services/session.service';

import {
    UiService
} from '../../services/ui.service';


@Component({
    selector:
        'app-session-details',

    standalone:
        true,

    imports: [
        DatePipe,
        RouterLink,
        IonButton,
        IonIcon,
        IonSpinner
    ],

    templateUrl:
        './session-details.page.html',

    styleUrl:
        './session-details.page.scss',

    changeDetection:
        ChangeDetectionStrategy.OnPush
})
export class SessionDetailsPage {

    private readonly route =
        inject(ActivatedRoute);

    private readonly service =
        inject(SessionService);

    private readonly ui =
        inject(UiService);


    readonly session =
        signal<InternetSession | null>(
            null
        );

    readonly loading =
        signal(true);

    readonly error =
        signal(false);


    constructor() {

        addIcons({
            arrowBackOutline,
            pauseCircleOutline,
            playCircleOutline,
            wifiOutline
        });


        const id =
            Number(
                this.route.snapshot.paramMap.get(
                    'id'
                )
            );


        if (
            Number.isInteger(id) &&
            id > 0
        ) {

            this.load(
                id
            );

        } else {

            this.loading.set(
                false
            );

            this.error.set(
                true
            );
        }
    }


    // =====================================================
    // LOAD SESSION
    // =====================================================

    load(
        id: number
    ): void {

        this.loading.set(
            true
        );

        this.error.set(
            false
        );


        this.service
            .getSession(
                id
            )
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

                    this.session.set(
                        response.session
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to load session:',
                        error
                    );


                    this.error.set(
                        true
                    );
                }
            });
    }


    // =====================================================
    // CHANGE SESSION STATUS
    // =====================================================

    async changeStatus():
        Promise<void> {

        const item =
            this.session();


        if (!item) {
            return;
        }


        const nextStatus =
            item.status ===
                'suspended'
                ? 'active'
                : 'suspended';


        const confirmed =
            await this.ui.confirm(

                nextStatus ===
                    'active'
                    ? 'Reactivate session?'
                    : 'Suspend session?',

                `This updates access state for ${
                    item.phone_number ||
                    'this customer'
                }.`,

                nextStatus ===
                    'active'
                    ? 'Reactivate'
                    : 'Suspend'
            );


        if (!confirmed) {
            return;
        }


        this.service
            .changeStatus(
                item.id,
                nextStatus
            )
            .subscribe({

                next: async () => {

                    this.session.update(
                        (current) => {

                            if (!current) {
                                return current;
                            }


                            return {
                                ...current,
                                status:
                                    nextStatus
                            };
                        }
                    );


                    await this.ui.toast(
                        `Session ${
                            nextStatus ===
                                'active'
                                ? 'reactivated'
                                : 'suspended'
                        }.`
                    );
                },


                error: async () => {

                    await this.ui.toast(
                        'Session status could not be changed.',
                        'danger'
                    );
                }
            });
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
            return '—';
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
            return '—';
        }


        return `TZS ${
            amount.toLocaleString(
                'en-TZ',
                {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2
                }
            )
        }`;
    }
}