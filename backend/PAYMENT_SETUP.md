# Backend update: Selcom, cash and HotSpot

## Scope

This archive contains the backend only. It adds Selcom Checkout, replaces the active
httpSMS/Lipa payment path, keeps company-admin cash approval, and connects payment
settlement to durable MikroTik jobs. Frontend changes are the next phase.

### Provider account required

Use **Selcom Checkout** credentials: API key, API secret, and vendor ID.
These are different from the RSA private key/account-number credentials for the
Selcom Business transfer API. Ask Selcom to enable Checkout and wallet pull for each
company's merchant account. No company shares another company's credentials.

Official protocol references reviewed on 2026-10-03:
- https://developers.selcommobile.com/ — Checkout: create-order-minimal, wallet-payment,
  order-status, list-orders, webhook signatures.
- https://developer.selcom.business/ — separate Business API and RSA authentication.

## Install and configure

1. Back up the current backend and database. Stop this backend's workers during cutover.
   Do not alter other applications on the shared VPS.
2. Replace the backend files with this archive. Remove the retired files listed in
   `BACKEND_CHANGES.md` if copying over an existing directory.
3. Keep the deployment's existing `.env`; the archive deliberately contains only an
   example, not live credentials. Remove the old HTTPSMS, LIPA and SMS matching variables.
4. Use Node 22+ and install with `npm ci`. Tests require dev dependencies; production
   may use `npm ci --omit=dev`.
5. Apply `src/database/migrations/002_selcom_payments.sql` to the existing application
   database using `psql -v ON_ERROR_STOP=1 -f src/database/migrations/002_selcom_payments.sql`.
   This requires the existing base tables. It is transactional and rerunnable.
   The supplied archive has no complete base schema or production database dump.
   Migration tests use a representative isolated PostgreSQL schema; validate on a
   staging copy of your actual schema before production, especially if payment_method
   uses a PostgreSQL enum or a compound CHECK rather than the existing text field.
6. Add `PAYMENT_ENCRYPTION_KEY`: generate once with
   `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`.
   Preserve this key across restarts/deployments and securely back it up. Replacing it
   requires re-encrypting stored credentials, including in-flight order snapshots.
7. Set `PUBLIC_API_URL=https://wifiportal.jmsolutions.co.tz` and
   `SELCOM_BASE_URL=https://apigw.selcommobile.com`, or Selcom's assigned HTTPS endpoint.
8. Start with `npm start`. Configure each company through its authenticated settings
   endpoint, test the connection, and enable online payment when ready.

The historical `001_httpsms_payment_gateway.sql` is retained as migration history;
do not rerun it to set up new payment functionality. Migration 002 removes legacy
payment JSON settings and disables old payment devices, but retains historical
SMS/payment records. Reconcile outstanding legacy online payments before cutover:
the removed SMS receiver cannot settle them, and pending payments prevent duplicate
purchases on the same device. Existing paid sessions remain available.

## Admin API contract

Existing auth and company middleware protect these endpoints. Superadmins use the
same suffix under `/api/platform/companies/:companyId` with explicit company context.

| Method | Company-admin URL | Purpose |
|---|---|---|
| GET | `/api/admin/company/payment-settings` | Configuration and presence flags only |
| PATCH | `/api/admin/company/payment-settings` | Save or replace company credentials |
| POST | `/api/admin/company/payment-settings/test` | Read-only Selcom connectivity test |
| GET | `/api/admin/payments/cash-requests` | Pending cash requests |
| PATCH | `/api/admin/payments/cash-requests/:reference/confirm` | Confirm money received |
| PATCH | `/api/admin/sessions/:id/status` | Existing session action route; see route file |

Settings body:
```json
{
  "payment": {
    "enabled": true,
    "vendor": "SELCOM_ASSIGNED_VENDOR",
    "buyer_email": "billing@your-company.example",
    "api_key": "replace-with-checkout-key",
    "api_secret": "replace-with-checkout-secret"
  }
}
```
Checkout requires buyer email. `buyer_email` is a company-configured receipt/contact
address for the minimal guest Wi-Fi flow; confirm this use with your Selcom onboarding.
The frontend need not ask each guest for an email.

Responses return `payment` with `api_key_present` and `api_secret_present`, never the
saved secrets. Omit a secret or send a blank string to retain it; a nonblank value
replaces it. Settings are stored in a dedicated table, encrypted with AES-256-GCM
and bound to the company ID. Existing company profile responses contain no secrets.
The old settings response shape `{company: ...}` must be updated in the admin UI.

The connection test reads orders; it does not charge money and does not prove a
specific vendor ID or wallet-pull permission. A controlled end-to-end test is still required.
Legacy payment-success simulation returns HTTP 410 in every environment.

## Customer portal API contract

- `POST /api/public/companies/:companySlug/payments/initiate`
- `POST /api/public/companies/:companySlug/payments/cash-request`
- `GET /api/public/companies/:companySlug/payments/:reference/status`

Online initiation takes `package_id`, `payment_method: "selcom"`, `phone_number`,
`mac`, `ip`, `router` (public router ID), and `login_url` (also accepts `loginUrl`).
Cash uses the separate route; phone is optional, but validated when present.
Price/duration always come from the company's active package, not the browser.

Responses contain `payment`, `message`, and (online only) `gateway.state`.
`gateway.state` is `pending` or `checking`. Remove all Lipa instructions/SMS/provider
selection UI. Display the mobile-money approval message and poll the status endpoint.
A 409 response carries `reference` for an existing pending payment or active session;
resume status/reconnect instead of starting another charge. The package-list API
already sorts by ascending price and retains fields for existing clients; the frontend
can show only name/duration, price and Pay. Backend package management remains available.

Cash confirmation records who approved it. It returns a successful payment with a
`pending_activation` session until the router job succeeds. Show "Activating internet"
until session status becomes `active`; payment success alone is not router success.

## Verification and recovery

Selcom callback: `POST /api/integrations/selcom/webhook` (public HTTPS).
Signed notifications trigger an authenticated order-status lookup. The worker also
checks orders when callbacks are missed. Settlement requires COMPLETED, matching
order ID and amount, TZS if present, and a provider receipt. Payment row locks plus a
provider-reference uniqueness index protect duplicate fulfillment.

Requests use a separate random provider order ID while customer transaction references
keep the requested `MODE-PHONE-MAC-ENDINGTIME` format. Cash references omit an absent phone.
The embedded ending time is the payment-time estimate; actual access expiry is recorded
on the session. Order records and payment records are committed together. Unstarted
orders are picked up by the worker after a restart. Unknown provider outcomes remain
pending/checking; wallet pulls are never blindly repeated after a timeout. If an order
stays checking with no provider record (for example, a crash at the external send boundary),
review it with Selcom before a controlled cancellation/retry. Do not mark it paid manually.

Credentials are snapshotted in encrypted order records so changing the configured
key does not silently switch a pending order to another merchant. Keep the old
provider credential valid until its pending orders settle.

## MikroTik behavior

- Router selection is `payment.router_id` + `company_id`; credentials prefer the router row.
- REST uses HTTPS, port 443 by default. Native API ports 8728/8729 are not REST ports.
  A supplied `rest_port` takes priority; other existing non-native `api_port` values remain supported.
- The existing HotSpot `hotspot1`, profile `default`, MAC authentication, WireGuard
  connectivity and walled-garden access to the portal/API must be configured.
- Payment commits before external provisioning. Jobs retry after outages and restart.
- Time is anchored at the first provisioning attempt. Retries use the same deadline,
  so a partial activation/retry cannot grant a fresh full package. A prolonged outage
  after the first attempt consumes that deadline; review affected purchases operationally.
- Suspension removes the HotSpot user, active session and stale host. If the router is
  offline, the response reports `router_change_pending` and the worker retries.
- Reactivation keeps the original expiry and grants only remaining time. Suspension
  does not pause the package clock. Expired sessions cannot be revived through this action.
- Expiry queues router revocation. An old purchase cannot disconnect a newer purchase
  on the same router/MAC.
- Existing self-signed RouterOS TLS behavior is retained for the WireGuard deployment.

## Verification performed

`npm test` includes existing tests, Selcom signing/encryption/tamper tests, mocked REST
revocation checks, and an isolated PostgreSQL integration test. The integration test
covers migration reruns, trusted prices, tenant isolation, duplicate cash confirmation,
router outage/retry, deadline preservation in Africa/Nairobi, expiry cleanup, masked
settings, duplicate checkout prevention, and amount-checked automatic settlement.

No real Selcom charge, deployed PostgreSQL migration, VPS change, or live router mutation
was performed. Complete those deployment checks with real company credentials and a
test customer device after the frontend has adopted the new API contract.
