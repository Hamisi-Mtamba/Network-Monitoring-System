import {
    computed,
    inject,
    Injectable,
    signal
} from '@angular/core';

import {
    HttpClient
} from '@angular/common/http';

import {
    Router
} from '@angular/router';

import {
    Observable,
    tap
} from 'rxjs';

import {
    API_CONFIG
} from '../config/api.config';

import {
    Admin,
    AdminResponse,
    LoginRequest,
    LoginResponse
} from '../models/admin.model';


/* =========================================================
   STORAGE KEYS
   ========================================================= */

const TOKEN_KEY =
    'isp_admin_token';

const ADMIN_KEY =
    'isp_admin_user';


/* =========================================================
   AUTHENTICATION SERVICE
   ========================================================= */

@Injectable({
    providedIn: 'root'
})
export class AuthService {

    // =====================================================
    // SERVICES
    // =====================================================

    private readonly http =
        inject(HttpClient);

    private readonly router =
        inject(Router);


    // =====================================================
    // AUTHENTICATION STATE
    // =====================================================

    /**
     * Keep both the token and administrator in Angular
     * reactive state.
     *
     * sessionStorage is used only for persistence across
     * page reloads within the current browser session.
     */
    private readonly tokenState =
        signal<string | null>(
            this.readStoredToken()
        );


    private readonly adminState =
        signal<Admin | null>(
            this.readStoredAdmin()
        );


    // =====================================================
    // PUBLIC AUTHENTICATION STATE
    // =====================================================

    readonly admin =
        this.adminState.asReadonly();


    readonly tokenSignal =
        this.tokenState.asReadonly();


    /**
     * A valid frontend session requires BOTH:
     *
     * - JWT token
     * - administrator identity
     */
    readonly isAuthenticated =
        computed(() => {

            return Boolean(
                this.tokenState() &&
                this.adminState()
            );
        });


    readonly role =
        computed(() => {

            return this.adminState()
                ?.role ??
                null;
        });


    readonly companyId =
        computed(() => {

            const admin =
                this.adminState();


            if (!admin) {
                return null;
            }


            if (
                admin.role ===
                'superadmin'
            ) {
                return null;
            }


            return (
                admin.company_id ??
                null
            );
        });


    // =====================================================
    // TOKEN GETTER
    // =====================================================

    get token():
        string | null {

        return this.tokenState();
    }


    // =====================================================
    // LOGIN
    // =====================================================

    login(
        credentials:
            LoginRequest
    ): Observable<LoginResponse> {

        return this.http
            .post<LoginResponse>(
                `${API_CONFIG.baseUrl}/auth/login`,
                credentials
            )
            .pipe(

                tap(
                    (response) => {

                        if (
                            !response.token ||
                            !response.admin
                        ) {

                            throw new Error(
                                'Invalid login response'
                            );
                        }


                        this.setSession(
                            response.token,
                            response.admin
                        );


                        console.log(
                            '[AuthService] Login session established',
                            {
                                role:
                                    response.admin.role,

                                companyId:
                                    response.admin.company_id,

                                authenticated:
                                    this.isAuthenticated()
                            }
                        );
                    }
                )
            );
    }


    // =====================================================
    // LOAD CURRENT ADMIN
    // =====================================================

    loadCurrentAdmin():
        Observable<AdminResponse> {

        return this.http
            .get<AdminResponse>(
                `${API_CONFIG.baseUrl}/auth/me`
            )
            .pipe(

                tap(
                    (response) => {

                        if (
                            !response.admin
                        ) {
                            return;
                        }


                        this.adminState.set(
                            response.admin
                        );


                        sessionStorage.setItem(
                            ADMIN_KEY,
                            JSON.stringify(
                                response.admin
                            )
                        );
                    }
                )
            );
    }


    // =====================================================
    // ROLE HELPERS
    // =====================================================

    isSuperAdmin():
        boolean {

        return (
            this.adminState()
                ?.role ===
            'superadmin'
        );
    }


    isCompanyAdmin():
        boolean {

        return (
            this.adminState()
                ?.role ===
            'admin'
        );
    }


    getCompanyId():
        number | null {

        return this.companyId();
    }


    // =====================================================
    // LOGOUT
    // =====================================================

    logout(
        redirect = true
    ): void {

        this.clearSession();


        if (redirect) {

            void this.router
                .navigateByUrl(
                    '/login',
                    {
                        replaceUrl:
                            true
                    }
                );
        }
    }


    // =====================================================
    // CREATE FRONTEND SESSION
    // =====================================================

    private setSession(
        token: string,
        admin: Admin
    ): void {

        /*
         * Update Angular reactive state first.
         *
         * Guards immediately see the authenticated
         * state during the following navigation.
         */
        this.tokenState.set(
            token
        );


        this.adminState.set(
            admin
        );


        /*
         * Persist after application state has been set.
         */
        sessionStorage.setItem(
            TOKEN_KEY,
            token
        );


        sessionStorage.setItem(
            ADMIN_KEY,
            JSON.stringify(
                admin
            )
        );
    }


    // =====================================================
    // CLEAR FRONTEND SESSION
    // =====================================================

    private clearSession():
        void {

        this.tokenState.set(
            null
        );


        this.adminState.set(
            null
        );


        sessionStorage.removeItem(
            TOKEN_KEY
        );


        sessionStorage.removeItem(
            ADMIN_KEY
        );
    }


    // =====================================================
    // READ STORED TOKEN
    // =====================================================

    private readStoredToken():
        string | null {

        try {

            return sessionStorage
                .getItem(
                    TOKEN_KEY
                );

        } catch {

            return null;
        }
    }


    // =====================================================
    // READ STORED ADMIN
    // =====================================================

    private readStoredAdmin():
        Admin | null {

        try {

            const stored =
                sessionStorage
                    .getItem(
                        ADMIN_KEY
                    );


            if (!stored) {
                return null;
            }


            const admin =
                JSON.parse(
                    stored
                ) as Admin;


            if (
                !admin ||
                !admin.id ||
                !admin.role
            ) {

                sessionStorage
                    .removeItem(
                        ADMIN_KEY
                    );


                return null;
            }


            return admin;

        } catch {

            sessionStorage
                .removeItem(
                    ADMIN_KEY
                );


            return null;
        }
    }
}