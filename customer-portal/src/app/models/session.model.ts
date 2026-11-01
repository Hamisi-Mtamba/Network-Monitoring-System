export interface InternetSession {
    id: number; package_id?: number; package_name?: string; amount_paid?: number;
    started_at: string; expires_at: string; transaction_reference?: string;
    status: 'active' | 'pending_activation' | 'suspended' | 'expired' | 'failed' | string;
    payment_method?: string; phone_number?: string;
}
export type SessionApiResponse = InternetSession | {session: InternetSession} | {data: InternetSession};
