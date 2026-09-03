import {
    inject
} from '@angular/core';

import {
    CanActivateFn,
    Router
} from '@angular/router';

import {
    AuthService
} from '../services/auth.service';


// =========================================================
// AUTH GUARD
// =========================================================

export const authGuard: CanActivateFn =
    (_route, state) => {

        const auth =
            inject(AuthService);

        const router =
            inject(Router);


        if (
            auth.isAuthenticated()
        ) {
            return true;
        }


        return router.createUrlTree(
            ['/login'],
            {
                queryParams: {
                    returnUrl:
                        state.url
                }
            }
        );
    };


// =========================================================
// GUEST GUARD
// =========================================================

export const guestGuard: CanActivateFn =
    () => {

        const auth =
            inject(AuthService);

        const router =
            inject(Router);


        // Not logged in
        if (
            !auth.isAuthenticated()
        ) {
            return true;
        }


        // Superadmin
        if (
            auth.isSuperAdmin()
        ) {

            return router.createUrlTree(
                [
                    '/platform',
                    'dashboard'
                ]
            );
        }


        // Company admin
        if (
            auth.isCompanyAdmin()
        ) {

            return router.createUrlTree(
                [
                    '/dashboard'
                ]
            );
        }


        // Invalid stored session
        auth.logout(
            false
        );


        return true;
    };


// =========================================================
// COMPANY ADMIN GUARD
// =========================================================

export const companyAdminGuard: CanActivateFn =
    (_route, state) => {

        const auth =
            inject(AuthService);

        const router =
            inject(Router);


        // Not logged in
        if (
            !auth.isAuthenticated()
        ) {

            return router.createUrlTree(
                ['/login'],
                {
                    queryParams: {
                        returnUrl:
                            state.url
                    }
                }
            );
        }


        // Correct role
        if (
            auth.isCompanyAdmin()
        ) {
            return true;
        }


        // Superadmin entered company-admin area
        if (
            auth.isSuperAdmin()
        ) {

            return router.createUrlTree(
                [
                    '/platform',
                    'dashboard'
                ]
            );
        }


        // Invalid account state
        auth.logout(
            false
        );


        return router.createUrlTree(
            ['/login']
        );
    };


// =========================================================
// SUPERADMIN GUARD
// =========================================================

export const superAdminGuard: CanActivateFn =
    (_route, state) => {

        const auth =
            inject(AuthService);

        const router =
            inject(Router);


        // Not logged in
        if (
            !auth.isAuthenticated()
        ) {

            return router.createUrlTree(
                ['/login'],
                {
                    queryParams: {
                        returnUrl:
                            state.url
                    }
                }
            );
        }


        // Correct role
        if (
            auth.isSuperAdmin()
        ) {
            return true;
        }


        // Company admin entered platform area
        if (
            auth.isCompanyAdmin()
        ) {

            return router.createUrlTree(
                ['/dashboard']
            );
        }


        // Invalid account state
        auth.logout(
            false
        );


        return router.createUrlTree(
            ['/login']
        );
    };