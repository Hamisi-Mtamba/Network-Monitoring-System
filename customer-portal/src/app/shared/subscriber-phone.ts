export const SUBSCRIBER_PHONE_PATTERN = /^[67]\d{8}$/;

export function toInternationalPhone(subscriber: string): string {
    if (!SUBSCRIBER_PHONE_PATTERN.test(subscriber)) {
        throw new Error('Enter a valid Tanzanian mobile number, for example 712345678.');
    }
    return `+255${subscriber}`;
}
