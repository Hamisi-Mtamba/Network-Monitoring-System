// =========================================================
// SHARED GENERIC REPORT TYPES
// =========================================================

export interface NamedCount {

    name?: string;

    status?: string;

    payment_method?: string;

    package_name?: string;

    count: number | string;
}


export interface RevenueByDate {

    date: string;

    revenue: number | string;
}


/* =========================================================
   EXISTING NORMAL ADMIN REPORT MODELS
   ========================================================= */

export interface RevenueReport {

    total_revenue: number | string;

    revenue_by_date: RevenueByDate[];
}


export interface PaymentReport {

    by_status: NamedCount[];

    by_payment_method: NamedCount[];
}


export interface SessionReport {

    active_sessions: number;

    expired_sessions: number;

    by_status: NamedCount[];

    by_package: NamedCount[];
}


/* =========================================================
   EXISTING NORMAL ADMIN RESPONSES
   ========================================================= */

export interface RevenueReportResponse {

    success: boolean;

    report?: RevenueReport;

    revenue?: RevenueReport;
}


export interface PaymentReportResponse {

    success: boolean;

    report?: PaymentReport;

    payments?: PaymentReport;
}


export interface SessionReportResponse {

    success: boolean;

    report?: SessionReport;

    sessions?: SessionReport;
}


/* =========================================================
   PLATFORM COMPANY REVENUE REPORT
   ========================================================= */

export interface CompanyRevenueReportItem {

    date: string;

    successful_payments: number;

    revenue: number;
}


export interface CompanyRevenueReportResponse {

    success: boolean;

    total_revenue: number;

    report: CompanyRevenueReportItem[];
}


/* =========================================================
   PLATFORM COMPANY PAYMENT REPORT
   ========================================================= */

export interface CompanyPaymentReportItem {

    status: string;

    payment_count: number;

    total_amount: number;
}


export interface CompanyPaymentReportResponse {

    success: boolean;

    report: CompanyPaymentReportItem[];
}


/* =========================================================
   PLATFORM COMPANY SESSION REPORT
   ========================================================= */

export interface CompanySessionReportItem {

    status: string;

    session_count: number;
}


export interface CompanySessionReportResponse {

    success: boolean;

    report: CompanySessionReportItem[];
}