// Possible internet-session states
export type SessionStatus =
    | 'active'
    | 'pending'
    | 'pending activation'
    | 'expired'
    | 'failed';


// Internet session returned by the backend
export interface InternetSession {

    // Session ID
    id: number;


    // Package ID may be omitted in some public responses
    package_id?: number;


    // Package display name
    package_name: string;


    // Amount paid for this session
    amount_paid: number;


    // Session start time
    started_at: string;


    // Session expiry time
    expires_at: string;


    // Payment transaction reference
    transaction_reference: string;


    // Current session state
    status:
        SessionStatus | string;


    // Payment method used
    payment_method?: string;


    // Customer phone number
    phone_number?: string;
}


// Supported public session API response shapes
export type SessionApiResponse =
    | InternetSession
    | {
        session: InternetSession;
    }
    | {
        data: InternetSession;
    };