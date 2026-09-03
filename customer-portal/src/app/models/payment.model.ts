// Import internet-session model
import {
    InternetSession
} from './session.model';


// Supported mobile-money methods
export type PaymentMethodId =
    | 'mpesa'
    | 'airtel_money'
    | 'mixx_by_yas'
    | 'halopesa';


// Common payment states
//
// The backend can still return additional string statuses
// such as awaiting_cash_confirmation, rejected, or cancelled.
export type PaymentStatus =
    | 'pending'
    | 'successful'
    | 'failed'
    | 'awaiting_cash_confirmation'
    | 'rejected'
    | 'cancelled';


// Payment option displayed in the customer portal
export interface PaymentMethodOption {

    id: PaymentMethodId;

    name: string;

    initials: string;

    color: string;

    // Logo image displayed by the payment-method card
    image: string;
}


// Mobile-money payment request
//
// Price is deliberately excluded.
// The backend reads the trusted package price from PostgreSQL.
export interface PaymentInitiationRequest {

    package_id: number;

    payment_method: PaymentMethodId;

    phone_number: string;

    mac: string;

    ip: string;

    router: string;

    login_url: string;
}


// Response returned after creating a mobile-money payment
export interface PaymentInitiationResponse {

    success: boolean;

    message: string;


    payment: {

        id: number;

        transaction_reference: string;

        status: PaymentStatus | string;

        amount: string | number;

        phone_number: string;

        payment_method: PaymentMethodId | string;


        // Package information returned by backend
        package: {

            id: number;

            name: string;

            duration_minutes: number;
        };
    };
}


// Response returned by:
//
// GET
// /api/public/companies/:companySlug/payments/:reference/status
export interface PaymentStatusResponse {

    success: boolean;


    // Payment details
    payment: {

        id: number;

        package_id: number;

        transaction_reference: string;

        status: PaymentStatus | string;

        amount: number | string;

        payment_method:
            PaymentMethodId | string;

        phone_number: string;

        paid_at: string | null;
    };


    // Session remains null while payment is pending.
    //
    // After payment is confirmed, the backend can return
    // the internet session created for that payment.
    session:
        InternetSession | null;
}


// Normalized information used by the payment-success page
export interface PaymentSuccessDetails {

    // Payment transaction reference
    reference: string;


    // Purchased package name
    packageName: string;


    // Confirmed amount paid
    amount: number;


    // Mobile money provider or cash
    paymentMethod: string;


    // Customer phone number
    phoneNumber: string;


    // Internet-session start time
    startedAt: string;


    // Internet-session expiry time
    expiresAt: string;


    // Created internet-session ID
    sessionId?: number;


    // Current session status
    status: string;
}