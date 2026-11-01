const clean = value => typeof value === 'string' ? value.trim() : '';

// Store mobile numbers in the same international format used by payments.
export const normalizeTanzanianPhone = value => {
    const digits = clean(value).replace(/[^0-9+]/g, '').replace(/^\+/, '');
    if (/^0[67]\d{8}$/.test(digits)) return `255${digits.slice(1)}`;
    if (/^255[67]\d{8}$/.test(digits)) return digits;
    return '';
};

// Accept common mobile-money amount formats, including comma separators.
const parseAmount = message => {
    const patterns = [
        /(?:TZS|TSH|Tsh|TSh)\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i,
        /([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:TZS|TSH|Tsh|TSh)/i,
        /(?:amount|kiasi)\s*[:=-]?\s*(?:TZS|TSH|Tsh|TSh)?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i
    ];

    for (const pattern of patterns) {
        const match = pattern.exec(message);
        if (!match) continue;
        const amount = Number(match[1].replace(/,/g, ''));
        if (Number.isFinite(amount) && amount > 0) return amount;
    }
    return null;
};

// Prefer labelled phone numbers; use an unlabelled number only when unambiguous.
const parsePayerPhone = message => {
    const labelled = [
        /(?:from|kutoka|payer|phone|mobile|namba)\s*[:=-]?\s*(\+?255[67]\d{8}|0[67]\d{8})/i,
        /(?:from|kutoka)\s+[^\n,;]{0,80}?\b(\+?255[67]\d{8}|0[67]\d{8})\b/i
    ];

    for (const pattern of labelled) {
        const match = pattern.exec(message);
        const normalized = normalizeTanzanianPhone(match?.[1] || '');
        if (normalized) return normalized;
    }

    const all = [...message.matchAll(/(?:\+?255[67]\d{8}|0[67]\d{8})/g)]
        .map(match => normalizeTanzanianPhone(match[0]))
        .filter(Boolean);

    return all.length === 1 ? all[0] : '';
};

// Extract provider references while tolerating common SMS wording variations.
const parseTransactionId = message => {
    const patterns = [
        /(?:transaction(?:\s*(?:id|no|number))?|trx(?:\s*(?:id|no|number))?|reference|ref|receipt|muamala|kumbukumbu)\s*[:#=-]?\s*([A-Z0-9][A-Z0-9_-]{5,39})/i,
        /^\s*([A-Z0-9]{7,20})\s+(?:confirmed|imethibitishwa)\b/i
    ];

    for (const pattern of patterns) {
        const match = pattern.exec(message);
        if (match?.[1]) return match[1].toUpperCase();
    }

    return '';
};

// Infer the mobile-money provider from the sender name and message contents.
const inferProvider = (sender, message) => {
    const haystack = `${sender} ${message}`.toLowerCase();
    if (haystack.includes('m-pesa') || haystack.includes('mpesa')) return 'mpesa';
    if (haystack.includes('airtel')) return 'airtel_money';
    if (haystack.includes('mixx') || haystack.includes('tigo pesa') || haystack.includes('yas')) return 'mixx_by_yas';
    if (haystack.includes('halopesa') || haystack.includes('halo pesa')) return 'halopesa';
    return 'mobile_money';
};

// Parse one SMS and report both usable fields and fields requiring review.
export const parsePaymentSms = ({ sender, message }) => {
    const raw = clean(message);
    const parsed = {
        provider: inferProvider(clean(sender), raw),
        providerTransactionId: parseTransactionId(raw),
        payerPhone: parsePayerPhone(raw),
        amount: parseAmount(raw)
    };

    const missing = [];
    if (!parsed.providerTransactionId) missing.push('transaction_id');
    if (!parsed.payerPhone) missing.push('payer_phone');
    if (!Number.isFinite(parsed.amount)) missing.push('amount');

    return {
        ...parsed,
        complete: missing.length === 0,
        missing
    };
};
