# Automatic Lipa Payment Setup

## 1. Database
Run:

`src/database/migrations/001_httpsms_payment_gateway.sql`

This creates the payment-phone and raw-SMS tables and adds verification fields to the existing `payments` table.

## 2. Company payment settings
Company Admin or Superadmin can configure:

- Lipa number
- Merchant/account name
- Customer payment instructions
- httpSMS owner
- Payment phone
- Device name
- Mobile-money enabled/disabled

The values are stored under `companies.settings.payment`. Saving an `httpsms_owner` also maps the httpSMS phone to that tenant in `payment_devices`.

## 3. Backend environment
Required:

```env
HTTPSMS_WEBHOOK_SIGNING_KEY=replace-with-the-signing-key-configured-in-httpsms
```

Optional:

```env
PAYMENT_MATCH_WINDOW_MINUTES=15
LIPA_NUMBER=
LIPA_ACCOUNT_NAME=
```

The LIPA environment values are only fallbacks when a tenant does not have its own company setting.

## 4. httpSMS webhook
Subscribe to `message.phone.received` and point it to:

`https://YOUR_BACKEND_DOMAIN/api/integrations/httpsms/webhook`

The backend verifies the HS256 bearer JWT, resolves the payment phone to a company, stores the original SMS idempotently, then processes it.

## 5. Automatic matching rule
An SMS is automatically approved only when the parser obtains all of:

- provider transaction ID
- payer mobile number
- amount

The backend then requires exactly one pending non-cash payment in the same company with:

- the same normalized Tanzanian payer number
- the exact amount
- a creation time inside `PAYMENT_MATCH_WINDOW_MINUTES`
- an unused provider transaction ID

On success, the payment becomes `successful`, an internet session is created, and MikroTik activation is attempted.

## 6. Admin review
Messages that cannot be safely auto-matched appear under:

Admin > Payments > SMS Review

The admin can:

- retry the parser
- inspect the original SMS
- see detected phone, amount and transaction ID
- manually match it to a pending payment

Manual matching still requires a usable transaction ID and an exact amount match.

## 7. Real provider SMS samples
The parser deliberately avoids guessing ambiguous data. Once real merchant confirmation SMS examples are available, add provider-specific patterns in:

`services/payment-sms-parser.service.js`

This improves the automatic match rate without changing the rest of the architecture.
