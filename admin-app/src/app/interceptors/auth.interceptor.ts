import {
    HttpErrorResponse,
    HttpInterceptorFn
} from '@angular/common/http';

import {
    inject
} from '@angular/core';

import {
    catchError,
    throwError
} from 'rxjs';

import {
    API_CONFIG
} from '../config/api.config';

import {
    AuthService
} from '../services/auth.service';


/* =========================================================
   AUTH INTERCEPTOR
   =========================================================
 *
 * Adds the JWT token to every protected administrator API:
 *
 * - /api/admin/*
 * - /api/platform/*
 *
 * Login remains public.
 *
 * A 401 response clears the stale frontend session and
 * returns the administrator to the login page.
 *
 * ========================================================= */

export const authInterceptor: HttpInterceptorFn =
    (
        request,
        next
    ) => {

        const auth =
            inject(AuthService);


        // =====================================================
        // API TYPE
        // =====================================================

        const isAdminApi =
            request.url.startsWith(
                API_CONFIG.baseUrl
            );


        const isPlatformApi =
            request.url.startsWith(
                API_CONFIG.platformUrl
            );


        const isProtectedApi =
            isAdminApi ||
            isPlatformApi;


        // =====================================================
        // PUBLIC AUTH ENDPOINTS
        // =====================================================

        const isLogin =
            request.url.endsWith(
                '/auth/login'
            );


        // =====================================================
        // CURRENT JWT
        // =====================================================

        const token =
            auth.token;


        // =====================================================
        // ATTACH JWT
        // =====================================================

        const authenticatedRequest =
            isProtectedApi &&
            !isLogin &&
            token

                ? request.clone({

                    setHeaders: {

                        Authorization:
                            `Bearer ${token}`
                    }
                })

                : request;


        // =====================================================
        // SEND REQUEST
        // =====================================================

        return next(
            authenticatedRequest
        )
            .pipe(

                catchError(
                    (
                        error:
                            HttpErrorResponse
                    ) => {

                        // =====================================
                        // EXPIRED / INVALID AUTHENTICATION
                        // =====================================

                        if (
                            error.status === 401 &&
                            isProtectedApi &&
                            !isLogin &&
                            auth.token
                        ) {

                            auth.logout();
                        }


                        // =====================================
                        // PROPAGATE ORIGINAL ERROR
                        // =====================================

                        return throwError(
                            () =>
                                error
                        );
                    }
                )
            );
    };