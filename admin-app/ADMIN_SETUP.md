# Admin app update

## Start locally (PowerShell)

Use this app with the updated backend and customer portal delivered in this conversation.
Apply the backend's Selcom migration and environment configuration first.

```powershell
npm ci
npm start -- --host 0.0.0.0 --port 4300
```

The development proxy forwards `/api` and `/uploads` to `http://127.0.0.1:4000`.
Change `proxy.conf.json` if your backend is on a different machine. Customer portal
can continue using port 4200. Dependency versions remain Angular 20 / Ionic 8.

## Build and test

```powershell
npm test -- --watch=false --browsers=ChromeHeadless
npm run build
```

Chrome must be installed for the tests. Deploy the contents of `www/` to the existing
admin hosting location. Keep `/api` and `/uploads` routed to the backend and enable
SPA fallback for admin routes. Preserve the existing customer portal and exact-root
marketing redirect. If the admin is hosted below a URL prefix, retain your existing
base-href/deployment configuration. No server, database, router or live credentials
were changed by this frontend update.

## Payment setup

Company admin: **Settings → Selcom Checkout**.
Superadmin: **Companies → select company → Payment Setup**.

Enter the Selcom Checkout vendor ID, buyer email, API key and API secret, then save.
Existing saved keys are never fetched or displayed; blank credential fields preserve
them. Use **Test saved connection** after saving. The backend owns credential encryption,
webhook verification and payment fulfilment. No credentials are embedded in the app.

Old Lipa/httpSMS settings, SMS matching and development success actions were removed
from the active admin application. Historical payments remain visible.

## Cash and internet access

Open **Payments → Cash Requests**. Confirm only after physically receiving the cash.
Confirmation marks payment received and starts the backend's router activation process.
It does not imply the router is already connected. Payment details show the associated
session and link to session details. Refresh the relevant page for current backend state.

## Workspace changes

- Company-admin navigation contains Dashboard, Payments, Sessions, Reports and Settings.
- Packages was removed from company-admin navigation and quick actions. Its old URL
  redirects to the dashboard. Existing package data and platform Superadmin package
  management remain available; backend authorization was not changed by this UI change.
- Company name/logo and branding appear in the shared shell. Primary and navbar text
  contrast adapts to saved colors, with validated color values and fallback defaults.
- Login navigates directly to the correct role's dashboard without waiting for branding.
- Restricted browser storage no longer causes successful login to fail.
- Session identity and company branding are cleared on logout. Backend suspension errors
  for an admin/company also end the frontend session.
- Detail routes recreate pages when their company or record ID changes.
- Refined login, sidebar, typography, responsive layouts and restrained motion. Reduced
  motion is respected. Existing branding upload and platform management controls remain.

## Validation and live checks

Production build and all 11 Jasmine/Karma tests passed. The build retains a non-blocking
component-style size warning for the large existing platform company workspace (~35 KB,
above its 20 KB warning threshold and below its 40 KB error threshold).

Unit tests cover authenticated role availability, blocked browser storage, suspended
accounts, logout branding reset, Selcom credential preservation and company scoping.

Before production use, verify real administrator accounts, a controlled Selcom transaction,
cash receipt and actual MikroTik activation/suspension on your network. Simulated browser
checks do not substitute for those live checks.

Browser checks against the production build with simulated APIs passed for both role logins,
company/Superadmin dashboards, removal of company package navigation, blank-secret preservation,
connection testing, cash confirmation, and company-scoped Superadmin payment setup.
Desktop and mobile screenshots were inspected. No live charges or router commands were issued.
