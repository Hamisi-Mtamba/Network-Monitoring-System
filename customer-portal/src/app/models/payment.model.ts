import { InternetSession } from './session.model';
export type PaymentMethodId = 'selcom';
export type PaymentStatus = 'pending' | 'successful' | 'failed' | 'awaiting_cash_confirmation' | 'rejected' | 'cancelled';
export interface PaymentInitiationRequest {
    package_id: number; payment_method: 'selcom'; phone_number: string;
    mac: string; ip: string; router: string; login_url: string;
}
export interface CashPaymentRequest extends Omit<PaymentInitiationRequest, 'payment_method' | 'phone_number'> { phone_number?: string; }
export interface PaymentRecord {
    id: number; package_id?: number; package_name?: string; duration_minutes?: number;
    transaction_reference: string; status: PaymentStatus | string;
    amount: number | string; phone_number?: string; payment_method: string; paid_at?: string | null;
}
export interface PaymentInitiationResponse {
    success: boolean; message: string; payment: PaymentRecord;
    gateway?: { state: 'pending' | 'checking'; message?: string };
}
export interface PaymentStatusResponse { success: boolean; payment: PaymentRecord; session: InternetSession | null; }
