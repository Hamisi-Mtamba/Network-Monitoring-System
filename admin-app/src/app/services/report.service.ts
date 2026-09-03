import {
    inject,
    Injectable
} from '@angular/core';

import {
    HttpClient
} from '@angular/common/http';

import {
    forkJoin,
    map,
    Observable
} from 'rxjs';

import {
    API_CONFIG
} from '../config/api.config';

import {
    CompanyPaymentReportResponse,
    CompanyRevenueReportResponse,
    CompanySessionReportResponse,
    NamedCount,
    PaymentReport,
    RevenueReport,
    SessionReport
} from '../models/report.model';


/* =========================================================
   NORMAL ADMIN REPORT BUNDLE
   ========================================================= */

export interface ReportsBundle {

    revenue: RevenueReport;

    payments: PaymentReport;

    sessions: SessionReport;
}


/* =========================================================
   SUPERADMIN COMPANY REPORT BUNDLE
   ========================================================= */

export interface CompanyReportsBundle {

    revenue: CompanyRevenueReportResponse;

    payments: CompanyPaymentReportResponse;

    sessions: CompanySessionReportResponse;
}


/* =========================================================
   BACKEND NORMAL ADMIN RESPONSE TYPES
   ========================================================= */

/**
 * These interfaces describe the backend controller exactly
 * as it already works today.
 *
 * We normalize them here instead of changing the backend
 * contract used by the Superadmin.
 */

interface BackendRevenueRow {

    date: string;

    successful_payments:
        number |
        string;

    revenue:
        number |
        string;
}


interface BackendRevenueResponse {

    success: boolean;

    total_revenue:
        number |
        string;

    report:
        BackendRevenueRow[];
}


interface BackendPaymentRow {

    status: string;

    payment_count:
        number |
        string;

    total_amount:
        number |
        string;
}


interface BackendPaymentResponse {

    success: boolean;

    report:
        BackendPaymentRow[];
}


interface BackendSessionRow {

    status: string;

    session_count:
        number |
        string;
}


interface BackendSessionResponse {

    success: boolean;

    report:
        BackendSessionRow[];
}


/* =========================================================
   REPORT SERVICE
   ========================================================= */

@Injectable({
    providedIn: 'root'
})
export class ReportService {

    private readonly http =
        inject(HttpClient);


    // =====================================================
    // NORMAL COMPANY ADMIN REPORT URL
    // =====================================================

    private readonly url =
        `${API_CONFIG.baseUrl}/reports`;


    // =====================================================
    // NORMAL COMPANY ADMIN REPORTS
    // =====================================================

    /**
     * Load all normal company-admin report endpoints.
     *
     * IMPORTANT:
     *
     * The backend response shape is intentionally left
     * unchanged because the Superadmin already depends
     * on that existing contract.
     *
     * We convert the response only here for ReportsPage.
     */
    getReports():
        Observable<ReportsBundle> {

        return forkJoin({

            revenueResponse:
                this.http.get<BackendRevenueResponse>(
                    `${this.url}/revenue`
                ),

            paymentResponse:
                this.http.get<BackendPaymentResponse>(
                    `${this.url}/payments`
                ),

            sessionResponse:
                this.http.get<BackendSessionResponse>(
                    `${this.url}/sessions`
                )

        }).pipe(

            map(
                ({
                    revenueResponse,
                    paymentResponse,
                    sessionResponse
                }) => {

                    // =========================================
                    // REVENUE
                    // =========================================

                    const revenue:
                        RevenueReport = {

                        total_revenue:
                            Number(
                                revenueResponse
                                    .total_revenue ??
                                0
                            ),

                        revenue_by_date:
                            (
                                revenueResponse
                                    .report ??
                                []
                            )
                            .map(
                                (item) => ({

                                    date:
                                        item.date,

                                    successful_payments:
                                        Number(
                                            item.successful_payments ??
                                            0
                                        ),

                                    revenue:
                                        Number(
                                            item.revenue ??
                                            0
                                        )
                                })
                            )
                    };


                    // =========================================
                    // PAYMENTS
                    // =========================================

                    const paymentStatus:
                        NamedCount[] =
                        (
                            paymentResponse
                                .report ??
                            []
                        )
                        .map(
                            (item) => ({

                                status:
                                    item.status,

                                count:
                                    Number(
                                        item.payment_count ??
                                        0
                                    )
                            })
                        );


                    /*
                     * The current backend report controller
                     * does not return payment-method grouping.
                     *
                     * Keep this empty instead of breaking the
                     * whole Reports page.
                     */
                    const payments:
                        PaymentReport = {

                        by_status:
                            paymentStatus,

                        by_payment_method:
                            []
                    };


                    // =========================================
                    // SESSIONS
                    // =========================================

                    const sessionStatus:
                        NamedCount[] =
                        (
                            sessionResponse
                                .report ??
                            []
                        )
                        .map(
                            (item) => ({

                                status:
                                    item.status,

                                count:
                                    Number(
                                        item.session_count ??
                                        0
                                    )
                            })
                        );


                    const activeSessions =
                        sessionStatus
                            .find(
                                (item) =>
                                    item.status ===
                                    'active'
                            )
                            ?.count ??
                        0;


                    const expiredSessions =
                        sessionStatus
                            .find(
                                (item) =>
                                    item.status ===
                                    'expired'
                            )
                            ?.count ??
                        0;


                    /*
                     * The current backend controller does not
                     * return package usage yet.
                     *
                     * Keep it empty until we add a dedicated
                     * endpoint/field without changing the
                     * existing Superadmin contract.
                     */
                    const sessions:
                        SessionReport = {

                        active_sessions:
                            Number(
                                activeSessions
                            ),

                        expired_sessions:
                            Number(
                                expiredSessions
                            ),

                        by_status:
                            sessionStatus,

                        by_package:
                            []
                    };


                    // =========================================
                    // FINAL NORMAL ADMIN VIEW MODEL
                    // =========================================

                    return {

                        revenue,

                        payments,

                        sessions
                    };
                }
            )
        );
    }


    // =====================================================
    // SUPERADMIN SELECTED COMPANY REPORTS
    // =====================================================

    /**
     * Leave the Superadmin API responses untouched.
     *
     * These were already working before the normal-admin
     * report fix.
     */
    getCompanyReports(
        companyId: number
    ): Observable<CompanyReportsBundle> {

        const baseUrl =
            `${API_CONFIG.platformUrl}/companies/${companyId}/reports`;


        return forkJoin({

            revenue:
                this.http.get<CompanyRevenueReportResponse>(
                    `${baseUrl}/revenue`
                ),

            payments:
                this.http.get<CompanyPaymentReportResponse>(
                    `${baseUrl}/payments`
                ),

            sessions:
                this.http.get<CompanySessionReportResponse>(
                    `${baseUrl}/sessions`
                )
        });
    }


    // =====================================================
    // INDIVIDUAL SUPERADMIN REPORT ENDPOINTS
    // =====================================================

    getCompanyRevenueReport(
        companyId: number
    ): Observable<CompanyRevenueReportResponse> {

        return this.http.get<CompanyRevenueReportResponse>(
            `${API_CONFIG.platformUrl}/companies/${companyId}/reports/revenue`
        );
    }


    getCompanyPaymentReport(
        companyId: number
    ): Observable<CompanyPaymentReportResponse> {

        return this.http.get<CompanyPaymentReportResponse>(
            `${API_CONFIG.platformUrl}/companies/${companyId}/reports/payments`
        );
    }


    getCompanySessionReport(
        companyId: number
    ): Observable<CompanySessionReportResponse> {

        return this.http.get<CompanySessionReportResponse>(
            `${API_CONFIG.platformUrl}/companies/${companyId}/reports/sessions`
        );
    }
}