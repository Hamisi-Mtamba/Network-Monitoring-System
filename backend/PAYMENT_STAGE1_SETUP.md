# Payment Stage 1 Setup

## Company Lipa number

The customer portal now expects the Lipa/merchant number from either:

1. `companies.settings.payment`, preferred for multi-tenant deployments, or
2. `LIPA_NUMBER` / `LIPA_ACCOUNT_NAME` environment variables as a small-deployment fallback.

Example company setting:

```sql
UPDATE companies
SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{payment}',
    '{"lipa_number":"YOUR_LIPA_NUMBER","account_name":"YOUR_ACCOUNT_NAME"}'::jsonb,
    true
)
WHERE slug = 'your-company-slug';
```

## httpSMS database foundation

Run:

`src/database/migrations/001_httpsms_payment_gateway.sql`

## Register the dedicated payment phone

After httpSMS is installed and you know the `owner` value sent in its webhook,
register that phone for the correct tenant:

```sql
INSERT INTO payment_devices (
    company_id,
    gateway,
    device_name,
    gateway_owner,
    phone_number
)
VALUES (
    YOUR_COMPANY_ID,
    'httpsms',
    'Main payment phone',
    'OWNER_VALUE_FROM_HTTPSMS',
    '2557XXXXXXXX'
);
```

## Environment variable

Set a strong httpSMS webhook signing key in the backend environment:

```text
HTTPSMS_WEBHOOK_SIGNING_KEY=replace-with-your-real-httpSMS-signing-key
```

Configure httpSMS to POST `message.phone.received` events to:

```text
https://YOUR_BACKEND_DOMAIN/api/integrations/httpsms/webhook
```

The current Stage 1 code verifies the signed webhook, resolves the registered
payment phone, stores the raw SMS idempotently, and acknowledges duplicates.
It intentionally does not parse or approve payments yet.

## Admin-configurable tenant gateway mapping

Company Admin and Superadmin payment settings can now also store:

- `httpsms_owner` — copy the owner value exactly as httpSMS sends it in `message.phone.received` events.
- `payment_phone` — the dedicated Android/SIM number used for merchant payment SMS.
- `device_name` — a readable label such as `Main payment phone`.

Saving a non-empty `httpsms_owner` also upserts the corresponding `payment_devices` row for that company. The webhook uses this row to route incoming SMS to the correct tenant.

The webhook signing key remains a server secret and is **not** editable by a company admin:

```env
HTTPSMS_WEBHOOK_SIGNING_KEY=replace-with-your-httpSMS-webhook-signing-key
```

The customer payment endpoint now respects `settings.payment.enabled` and returns the company's optional `settings.payment.instructions` with the Lipa card.
