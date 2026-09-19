import { InternetSession } from './session.model';

export type PaymentMethodId = 'lipa';

// Legacy card type is kept temporarily so the unused payment-method component
// can remain in the project without affecting the new single-Lipa checkout.
export interface PaymentMethodOption {
    id: string;
    name: string;
    initials: string;
    color: string;
    image: string;
}

export type PaymentStatus =
    | 'pending'
    | 'successful'
    | 'failed'
    | 'awaiting_cash_confirmation'
    | 'rejected'
    | 'cancelled';

export interface PaymentInitiationRequest {
    package_id: number;
    payment_method: PaymentMethodId;
    phone_number: string;
    mac: string;
    ip: string;
    router: string;
    login_url: string;
}

export interface PaymentInstructions {
    lipa_number: string;
    account_name?: string | null;
    instructions?: string | null;
}

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
        package?: {
            id: number;
            name: string;
            duration_minutes: number;
        };
    };
    payment_instructions?: PaymentInstructions;
}

export interface PaymentStatusResponse {
    success: boolean;
    payment: {
        id: number;
        package_id: number;
        transaction_reference: string;
        status: PaymentStatus | string;
        amount: number | string;
        payment_method: PaymentMethodId | string;
        phone_number: string;
        paid_at: string | null;
    };
    session: InternetSession | null;
}

export interface PaymentSuccessDetails {
    reference: string;
    packageName: string;
    amount: number;
    paymentMethod: string;
    phoneNumber: string;
    startedAt: string;
    expiresAt: string;
    sessionId?: number;
    status: string;
}
