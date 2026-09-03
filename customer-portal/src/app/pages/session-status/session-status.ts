// Import Angular common utilities
import {
    DatePipe
} from '@angular/common';


// Import Angular component utilities
import {
    Component,
    DestroyRef,
    OnInit,
    inject,
    signal
} from '@angular/core';


// Import Angular routing utilities
import {
    ActivatedRoute,
    Router,
    RouterLink
} from '@angular/router';


// Import RxJS utilities
import {
    Subscription,
    interval
} from 'rxjs';


// Import reusable loading component
import {
    LoadingSpinnerComponent
} from '../../components/loading-spinner/loading-spinner';


// Import reusable status component
import {
    StatusCardComponent
} from '../../components/status-card/status-card';


// Import session model
import {
    InternetSession
} from '../../models/session.model';


// Import session service
import {
    SessionService
} from '../../services/session.service';


// Import tenant/company service
import {
    TenantService
} from '../../services/tenant.service';


@Component({
    selector: 'app-session-status-page',

    standalone: true,

    imports: [
        DatePipe,
        RouterLink,
        LoadingSpinnerComponent,
        StatusCardComponent
    ],

    templateUrl: './session-status.html',

    styleUrl: './session-status.css'
})
export class SessionStatusPageComponent
    implements OnInit {

    // Current internet session
    readonly session =
        signal<InternetSession | null>(null);


    // Page loading state
    readonly loading =
        signal(true);


    // Customer-friendly error message
    readonly errorMessage =
        signal('');


    // Human-readable remaining session time
    readonly remainingTime =
        signal('Calculating...');


    // Timer subscription used to update countdown
    private clockSubscription?:
        Subscription;


    // Access current route parameters
    private readonly route =
        inject(ActivatedRoute);


    // Access Angular navigation
    private readonly router =
        inject(Router);


    // Access session API
    private readonly sessionService =
        inject(SessionService);


    // Access current company/tenant
    readonly tenantService =
        inject(TenantService);


    // Access Angular destruction lifecycle
    private readonly destroyRef =
        inject(DestroyRef);


    constructor() {

        // Always stop countdown when page is destroyed
        this.destroyRef.onDestroy(
            () => this.stopClock()
        );
    }


    // Resolve company and session when page opens
    ngOnInit(): void {

        // Read company slug from:
        // /:companySlug/session/:id
        const companySlug =
            this.route.snapshot.paramMap.get(
                'companySlug'
            );


        // Read session ID from route
        const sessionId =
            Number(
                this.route.snapshot.paramMap.get(
                    'id'
                )
            );


        // Company must exist in tenant-aware URL
        if (!companySlug) {

            this.errorMessage.set(
                'The Wi-Fi provider could not be identified.'
            );

            this.loading.set(false);

            return;
        }


        // Validate session ID
        if (
            !Number.isInteger(sessionId) ||
            sessionId <= 0
        ) {

            this.errorMessage.set(
                'The session number is invalid.'
            );

            this.loading.set(false);

            return;
        }


        // Store tenant immediately
        this.tenantService.setCompanySlug(
            companySlug
        );


        // Load company profile and branding first
        this.tenantService
            .loadCompany(companySlug)
            .subscribe({

                next: () => {

                    // Company is valid,
                    // so load the session inside that company
                    this.loadSession(
                        companySlug,
                        sessionId
                    );
                },


                error: (error) => {

                    console.error(
                        'Failed to load company:',
                        error
                    );


                    this.errorMessage.set(
                        'This Wi-Fi provider is currently unavailable.'
                    );


                    this.loading.set(false);
                }
            });
    }


    // Load one internet session from the correct company
    private loadSession(
        companySlug: string,
        sessionId: number
    ): void {

        this.sessionService
            .getSession(
                companySlug,
                sessionId
            )
            .subscribe({

                next: (response: any) => {

                    // Support either:
                    // { session: {...} }
                    // or direct session object
                    const session =
                        response?.session ??
                        response;


                    // Stop if backend did not return session data
                    if (!session) {

                        this.errorMessage.set(
                            'This internet session could not be found.'
                        );

                        this.loading.set(false);

                        return;
                    }


                    // Store session
                    this.session.set(
                        session as InternetSession
                    );


                    // Finish loading
                    this.loading.set(false);


                    // Calculate countdown immediately
                    this.updateRemainingTime();


                    // Refresh countdown every second
                    this.clockSubscription =
                        interval(
                            1_000
                        )
                            .subscribe(
                                () =>
                                    this.updateRemainingTime()
                            );
                },


                error: (error) => {

                    console.error(
                        'Failed to load session:',
                        error
                    );


                    this.errorMessage.set(
                        'Session not found or the service is temporarily unavailable.'
                    );


                    this.loading.set(false);
                }
            });
    }


    // Recalculate remaining internet time
    private updateRemainingTime(): void {

        // Read current session
        const session =
            this.session();


        // Nothing to calculate
        if (!session) {
            return;
        }


        // Convert expiry timestamp to milliseconds
        const expiresAt =
            new Date(
                session.expires_at
            )
                .getTime();


        // Calculate remaining duration
        const difference =
            expiresAt -
            Date.now();


        // Read session status safely
        const status =
            session.status
                ?.toLowerCase();


        // Session has expired
        if (
            difference <= 0 ||
            status === 'expired'
        ) {

            this.remainingTime.set(
                'Expired'
            );


            // Stop countdown
            this.stopClock();


            // Get current company slug
            const companySlug =
                this.tenantService.companySlug();


            // Navigate to tenant-aware expired page
            if (companySlug) {

                void this.router.navigate([
                    '/',
                    companySlug,
                    'expired'
                ]);
            }


            return;
        }


        // Convert remaining time into seconds
        const totalSeconds =
            Math.floor(
                difference / 1_000
            );


        // Calculate full days
        const days =
            Math.floor(
                totalSeconds /
                86_400
            );


        // Calculate remaining hours
        const hours =
            Math.floor(
                (
                    totalSeconds %
                    86_400
                ) /
                3_600
            );


        // Calculate remaining minutes
        const minutes =
            Math.floor(
                (
                    totalSeconds %
                    3_600
                ) /
                60
            );


        // Calculate remaining seconds
        const seconds =
            totalSeconds %
            60;


        // Build readable countdown
        this.remainingTime.set(
            [
                days
                    ? `${days}d`
                    : '',

                `${hours}h`,

                `${minutes}m`,

                `${seconds}s`
            ]
                .filter(Boolean)
                .join(' ')
        );
    }


    // Stop countdown subscription
    private stopClock(): void {

        this.clockSubscription
            ?.unsubscribe();


        this.clockSubscription =
            undefined;
    }
}