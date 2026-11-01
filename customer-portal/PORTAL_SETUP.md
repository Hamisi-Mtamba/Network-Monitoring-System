# Customer portal update

## Included changes

- Minimal package rows: duration, name, price, Pay. Lowest prices first.
- Tenant branding and uploaded banner/background images remain supported.
- Refined responsive layout, small entrance/transitional animations, reduced-motion support.
- Selcom Checkout replaces Lipa-number and manual SMS instructions.
- Cash is a secondary choice. Its phone number is optional; supplied numbers are validated.
- A successful payment shows activation in progress until the backend reports an active session.
- Payment-status URLs support refresh without starting another payment. Pending references are
  scoped to company, router and MAC address in browser storage, when available.
- A backend 409 with an existing reference resumes that request rather than starting another charge.
- Status requests use the original company slug. Changing company/payment routes resets page state.
- Session details refresh periodically and continue to distinguish active, suspended and expired access.
- Buttons that leave for browsing recheck the backend first. No expiry is invented in the browser.

## Prerequisite

Install the updated backend from this conversation and apply its Selcom migration first.
Configure each company's Selcom Checkout API key, API secret and vendor ID on the backend.
The portal does not contain or request merchant credentials.

## Local development (Windows / PowerShell)

From the extracted customer portal folder:

```powershell
npm ci
npm start -- --host 0.0.0.0
```

`proxy.conf.json` forwards `/api` and `/uploads` to `http://127.0.0.1:4000`.
Change that target if the backend runs on a different development computer.
Use the same customer portal address allowed by the MikroTik walled garden.
The project retains the supplied Angular 22 version and its npm lockfile.

## Production

```powershell
npm ci
npm test -- --watch=false
npm run build
```

Deploy the contents of `dist/customer-portal/browser` using the existing portal hosting setup.
Keep `/api` and `/uploads` routed to the backend, and use SPA fallback for customer routes.
Preserve the existing exact-root marketing redirect and the separate admin/platform routes.
No production server or router was changed by this update.

## Routes and API behavior

- `/:companySlug/packages` — choose a package.
- `/:companySlug/payment/:packageId` — mobile-money checkout; sends `payment_method: "selcom"`.
- `/:companySlug/cash-payment/:packageId` — request cash approval.
- `/:companySlug/payment-status/:reference` — waiting, cash approval, activation, and confirmed access.
- Old `payment-success/:reference` and `cash-payment-status/:reference` URLs resolve to the same
  server-verified status page so saved links remain usable.
- `/:companySlug/session/:id` — remaining time and current access status.
- `/:companySlug/company` — contact information.

Wi-Fi parameters `mac`, `ip`, `router`, `loginUrl`, and `originalUrl` retain the existing capture
and storage behavior. A device with active access still reconnects before purchasing again.

Polling is non-overlapping, stops when the page is destroyed, and pauses after ten minutes of
waiting. The customer can check again. Network errors never mean payment failure. A request
with an uncertain result offers a recovery action; the updated backend deduplicates the device
request and returns its existing reference. This depends on deploying the backend update first.

Old provider-choice cards/artwork and Lipa copy were removed. Extract into a clean folder, or
remove the retired files listed in `PORTAL_CHANGES.md` when merging into an existing project.
Do not copy build caches or node_modules from the old archive.

## Validation

Automated tests cover existing Wi-Fi context and reconnect behavior, phone validation,
branding images, payment-versus-activation state, and tenant-scoped payment recovery.
Live Selcom transactions and live MikroTik access still require a controlled test on your network.

Verification completed: production build and all 53 automated tests passed. Browser checks with
simulated API responses passed for desktop/mobile layout, Selcom submission, refresh recovery,
delayed activation, active session status and cash requests without a phone number.
These browser checks did not perform real charges or router operations.
