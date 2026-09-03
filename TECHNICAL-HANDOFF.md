# NETWORK MONITORING SYSTEM — TECHNICAL HANDOFF v1.0

**Status**: Version 1 Frontend Analysis Complete  
**Date**: 2026-08-30  
**Purpose**: Complete technical documentation of current frontend architecture before multi-tenant refactor  

---

## EXECUTIVE SUMMARY

The Network-Monitoring-System consists of three components:
1. **admin-app** (Angular 20.3.25 + Ionic 8) — ISP administrator dashboard
2. **customer-portal** (Angular 22.1.0) — End-user WiFi package checkout portal  
3. **backend** (Express.js) — Already partially refactored for multi-tenancy

**Critical Finding**: Backend has been significantly refactored toward multi-tenancy, but BOTH frontends remain single-company/single-tenant. Frontend and backend route contracts have significant mismatches.

---

# SECTION 1 — REPOSITORY STRUCTURE

```
Network-Monitoring-System/
├── README.md
├── admin-app/                          # Angular 20.3.25 admin dashboard
│   ├── package.json                    # Dependencies & scripts
│   ├── angular.json                    # Angular CLI config
│   ├── capacitor.config.ts             # Mobile wrapper config
│   ├── tsconfig.json                   # TypeScript config
│   ├── karma.conf.js                   # Test runner config
│   └── src/
│       ├── main.ts                     # Bootstrap entry
│       ├── index.html                  # Root HTML
│       ├── global.scss                 # Global styles
│       ├── environments/               # Environment configs (prod/dev)
│       ├── assets/                     # Static images/icons
│       ├── theme/
│       │   └── variables.scss          # CSS variables (hardcoded)
│       └── app/
│           ├── app.routes.ts           # Root routing config
│           ├── app.config.ts           # App config
│           ├── app.component.ts/.html/.scss
│           ├── config/
│           │   └── api.config.ts       # Backend URL config
│           ├── guards/
│           │   └── auth.guard.ts       # authGuard, guestGuard
│           ├── interceptors/
│           │   └── auth.interceptor.ts # JWT handler
│           ├── layout/
│           │   └── admin-layout/       # Main sidebar/nav layout
│           │       ├── admin-layout.component.ts
│           │       ├── admin-layout.component.html
│           │       └── admin-layout.component.scss
│           ├── services/               # Core services
│           │   ├── auth.service.ts     # JWT + login
│           │   ├── company.service.ts  # Company profile (partial)
│           │   ├── dashboard.service.ts
│           │   ├── package.service.ts
│           │   ├── payment.service.ts
│           │   ├── session.service.ts
│           │   ├── report.service.ts
│           │   └── ui.service.ts       # Toast/confirm dialogs
│           ├── models/                 # TypeScript interfaces
│           │   ├── admin.model.ts      # Admin, LoginRequest, LoginResponse
│           │   ├── company.model.ts    # Company, CompanyBranding (NOT used)
│           │   ├── package.model.ts    # InternetPackage
│           │   ├── payment.model.ts    # Payment, PaymentStatus
│           │   ├── session.model.ts    # InternetSession
│           │   ├── dashboard.model.ts  # DashboardStats
│           │   └── report.model.ts     # Report interfaces
│           └── pages/
│               ├── login/              # Public login page
│               │   ├── login.page.ts
│               │   ├── login.page.html
│               │   └── login.page.scss
│               ├── dashboard/          # Admin dashboard
│               ├── packages/           # Package management (CRUD)
│               ├── payments/           # Payment list + cash requests
│               ├── payment-details/    # Single payment detail view
│               ├── sessions/           # Internet session management
│               ├── session-details/    # Single session detail
│               ├── reports/            # Revenue/payment/session reports
│               └── settings/           # Admin profile view (logout only)
│
├── customer-portal/                    # Angular 22.1.0 customer checkout
│   ├── package.json                    # Dependencies
│   ├── angular.json                    # Angular CLI config
│   ├── tsconfig.json                   # TypeScript config
│   ├── public/                         # Static public assets
│   │   └── assets/images/payments/     # Payment method logos
│   └── src/
│       ├── main.ts                     # Bootstrap
│       ├── index.html                  # Root
│       ├── styles.css                  # Global styles
│       ├── mocks/                      # Demo data (fallback)
│       └── app/
│           ├── app.routes.ts           # Root routing
│           ├── app.config.ts           # Config
│           ├── app.html/.ts/.css
│           ├── config/
│           │   └── api.config.ts       # Backend URL (http://localhost:4000)
│           ├── models/
│           │   ├── package.model.ts
│           │   ├── payment.model.ts
│           │   └── session.model.ts
│           ├── services/
│           │   ├── package.service.ts
│           │   ├── payment.service.ts
│           │   └── session.service.ts
│           ├── components/
│           │   ├── loading-spinner/
│           │   ├── package-card/
│           │   ├── payment-method-card/
│           │   └── status-card/
│           └── pages/
│               ├── packages/           # Choose package
│               ├── payment/            # Choose payment method + initiate
│               ├── payment-success/    # Confirmation page
│               ├── session-status/     # Active session status display
│               ├── cash-payment/       # Cash payment initiation
│               ├── cash-payment-status/# Cash payment status polling
│               └── expired/            # Session expired notice
│
└── backend/                            # Express.js API
    ├── package.json
    ├── app.js                          # Express app setup (minimal)
    ├── index.js                        # Server + route mounting
    ├── .env                            # Environment variables
    ├── src/
    │   ├── constants.js                # PORT, JWT_SECRET, etc
    │   ├── database/
    │   │   └── database.js             # PostgreSQL pool
    │   ├── middlewares/
    │   │   ├── adminAuth.middleware.js # JWT verification + admin lookup
    │   │   ├── requireSuperAdmin.middleware.js
    │   │   ├── requireCompanyAdmin.middleware.js
    │   │   ├── platformCompanyContext.middleware.js
    │   │   ├── companyImageUpload.middleware.js
    │   │   └── uploadError.middleware.js
    │   ├── controllers/
    │   │   ├── admin/                  # Admin-facing endpoints
    │   │   │   ├── auth.controller.js
    │   │   │   ├── package.controller.js
    │   │   │   ├── payment.controller.js
    │   │   │   ├── session.controller.js
    │   │   │   ├── dashboard.controller.js
    │   │   │   ├── report.controller.js
    │   │   │   ├── companyProfile.controller.js
    │   │   │   └── companyImage.controller.js
    │   │   ├── public/                 # Customer-facing endpoints
    │   │   │   ├── package.controller.js
    │   │   │   ├── payment.controller.js
    │   │   │   ├── session.controller.js
    │   │   │   └── company.controller.js
    │   │   ├── super-admin/
    │   │   │   └── superAdmin.controller.js
    │   │   └── platform/
    │   │       └── company routes/controllers
    │   └── routes/
    │       ├── admin/
    │       │   ├── auth.routes.js
    │       │   ├── package.route.js
    │       │   ├── payment.route.js
    │       │   ├── session.route.js
    │       │   ├── dashboard.route.js
    │       │   ├── report.route.js
    │       │   └── companyProfile.route.js
    │       ├── public/
    │       │   ├── package.routes.js
    │       │   ├── payment.routes.js
    │       │   ├── session.route.js
    │       │   └── company.route.js
    │       ├── super-admin/
    │       │   └── superAdmin.routes.js
    │       └── platform/
    │           └── company.routes.js
    └── uploads/
        └── companies/1/                # Company logos/images
```

---

# SECTION 2 — VERSION 1 ADMIN-APP ARCHITECTURE

### Current State: SINGLE-COMPANY MODEL

**The admin-app is built for ONE company with ONE Super Admin managing multiple normal Admins.**

**Current Assumptions**:
- All data belongs to one company (hardcoded/implicit)
- No company_id passed to API endpoints from frontend
- No company selection/switching UI
- No multi-tenant routing
- All admins operate on the same company's data
- Super Admin functionality NOT implemented in frontend (backend routes exist but unused)

**Key Distinction**:
```
VERSION 1 ADMIN-APP
├── Super Admin role exists in backend but NO frontend UI
├── Normal Admin UI (currently implemented)
│   ├── View packages for ONE company (implicit)
│   ├── View payments for ONE company (implicit)
│   ├── View sessions for ONE company (implicit)
│   ├── View dashboard for ONE company (implicit)
│   ├── View reports for ONE company (implicit)
│   └── View profile (logout only)
└── NO company management/branding/switching
```

---

# SECTION 3 — ADMIN-APP TECH STACK

| Component | Version | Notes |
|-----------|---------|-------|
| **Angular** | 20.3.25 | Latest modern Angular |
| **Ionic** | 8.0.0 | Hybrid mobile + web UI |
| **TypeScript** | Latest | Strict mode recommended |
| **RxJS** | 7.8.0 | Reactive programming |
| **Capacitor** | 8.5.0 | Mobile wrapper |
| **Forms** | Reactive (`@angular/forms`) | FormBuilder, FormGroup |
| **Routing** | Standalone components + lazy loading | No NgModules |
| **State Management** | Signals (`@angular/core`) | Angular signals (no Redux/NgRx) |
| **HTTP** | `HttpClient` with interceptor | JWT Bearer token |
| **Authentication** | JWT in sessionStorage | Keys: `isp_admin_token`, `isp_admin_user` |
| **UI Icons** | Ionicons 7.0.0 | Icon library |
| **Storage** | sessionStorage only | Cleared on browser close |

**Key Files**:
- `angular.json` — Build config
- `tsconfig.json` — TypeScript config
- `app.routes.ts` — Main routing  
- `app.config.ts` — Standalone app config
- `src/app/config/api.config.ts` — Backend URL (`http://localhost:4000/api/admin`)

---

# SECTION 4 — ADMIN-APP ROUTES

All routes protected by `authGuard` except `/login`.

| Path | Component | File | Guard | Lazy Load | Notes |
|------|-----------|------|-------|-----------|-------|
| `/login` | LoginPage | `pages/login/login.page.ts` | guestGuard | Yes | No auth required |
| `` (empty) | AdminLayoutComponent | `layout/admin-layout/admin-layout.component.ts` | authGuard | Yes | Shared layout wrapper |
| `/dashboard` | DashboardPage | `pages/dashboard/dashboard.page.ts` | authGuard | Yes | Statistics overview |
| `/packages` | PackagesPage | `pages/packages/packages.page.ts` | authGuard | Yes | Package CRUD |
| `/payments` | PaymentsPage | `pages/payments/payments.page.ts` | authGuard | Yes | Payment list + cash mgmt |
| `/payments/:id` | PaymentDetailsPage | `pages/payment-details/payment-details.page.ts` | authGuard | Yes | Single payment detail |
| `/sessions` | SessionsPage | `pages/sessions/sessions.page.ts` | authGuard | Yes | Session list + status change |
| `/sessions/:id` | SessionDetailsPage | `pages/session-details/session-details.page.ts` | authGuard | Yes | Single session detail |
| `/reports` | ReportsPage | `pages/reports/reports.page.ts` | authGuard | Yes | Revenue/payment/session charts |
| `/settings` | SettingsPage | `pages/settings/settings.page.ts` | authGuard | Yes | Admin profile view only |
| `**` | (default) | — | — | — | Redirects to `/dashboard` |

**NO routes for**:
- Super Admin pages
- Company management
- Company profile/branding
- Admin management (create/edit/suspend admins)
- Company switching

---

# SECTION 5 — ADMIN AUTHENTICATION IMPLEMENTATION

### Files
- `src/app/services/auth.service.ts` — Core auth logic
- `src/app/guards/auth.guard.ts` — Route protection
- `src/app/interceptors/auth.interceptor.ts` — JWT injection
- `src/app/pages/login/login.page.ts` — Login UI
- `src/app/models/admin.model.ts` — Data types

### Login Flow

**LoginPage** (`login.page.ts`):
```typescript
// Form fields
email: string (email validator)
password: string (6+ char validator)

// Submit handler
submit() → AuthService.login(credentials) → Observable<LoginResponse>
```

**AuthService.login()**:
```typescript
POST /api/admin/auth/login
Request body: { email: string, password: string }

Expected response: {
  success: boolean,
  message: string,
  token: string (JWT),
  admin: {
    id: number,
    name: string,
    email: string,
    is_active?: boolean,
    status?: string
  }
}

On success:
- Store JWT in sessionStorage with key: 'isp_admin_token'
- Store Admin object in sessionStorage with key: 'isp_admin_user' (JSON)
- Emit through adminState signal
- Redirect to /dashboard (or queryParam returnUrl)

On error:
- Show error toast: "Unable to sign in..."
```

### Current Admin Access

**AuthService.loadCurrentAdmin()**:
```typescript
GET /api/admin/auth/me
Headers: Authorization: Bearer {token}

Response: {
  success: boolean,
  admin: { id, name, email, is_active, status }
}

Action: Update adminState signal + sessionStorage
```

### Token Storage

| Key | Value | Storage | Lifecycle |
|-----|-------|---------|-----------|
| `isp_admin_token` | JWT string | sessionStorage | Browser tab session only |
| `isp_admin_user` | JSON admin object | sessionStorage | Browser tab session only |

### Auth Guard

**authGuard** (route protection):
```typescript
if (auth.token exists) → allow route activation
else → redirect to /login?returnUrl={currentUrl}
```

**guestGuard** (keep logged-in out of login):
```typescript
if (auth.token exists) → redirect to /dashboard
else → allow /login
```

### HTTP Interceptor

**auth.interceptor.ts**:
```typescript
For every request to /api/admin/*:
  if (not /auth/login endpoint) AND (token exists)
    → Add header: Authorization: Bearer {token}

On 401 response:
  if (is admin API) AND (is not login) AND (token exists)
    → Call auth.logout()
    → Clear sessionStorage
    → Redirect to /login
```

### Logout

**AuthService.logout()**:
```typescript
- Remove 'isp_admin_token' from sessionStorage
- Remove 'isp_admin_user' from sessionStorage
- Clear adminState signal
- Redirect to /login (with replaceUrl=true)
```

---

# SECTION 6 — CURRENT SUPER ADMIN IMPLEMENTATION

### Status: NOT IMPLEMENTED IN FRONTEND

**Backend Super Admin Routes EXIST** (`/api/super-admin/`):
```
GET    /api/super-admin/admins                    — List all admins
GET    /api/super-admin/admins/:id                — Get one admin
POST   /api/super-admin/admins                    — Create admin
PATCH  /api/super-admin/admins/:id/suspend       — Suspend admin
PATCH  /api/super-admin/admins/:id/activate      — Reactivate admin
PATCH  /api/super-admin/admins/:id/password      — Change password
DELETE /api/super-admin/admins/:id                — Delete admin
GET    /api/super-admin/system/status            — System status
PATCH  /api/super-admin/system/suspend           — Suspend system
PATCH  /api/super-admin/system/activate          — Activate system
```

**Frontend Status**:
- ❌ NO routes for Super Admin UI
- ❌ NO Super Admin pages
- ❌ NO admin management UI
- ❌ NO admin creation/suspension/deletion UI
- ❌ NO system control UI

**Current Role Representation**:
- Backend stores `role: "admin" | "superadmin"` in admin object
- Frontend NEVER checks role
- No role-based UI rendering
- No role-based route guarding

---

# SECTION 7 — ADMIN-APP LAYOUT / SIDEBAR / HEADER

### Files
- `src/app/layout/admin-layout/admin-layout.component.ts` — Component logic
- `src/app/layout/admin-layout/admin-layout.component.html` — Template
- `src/app/layout/admin-layout/admin-layout.component.scss` — Styles

### Layout Structure
```
AdminLayoutComponent (Standalone)
├── <ion-split-pane>                 # Desktop side-by-side layout
│   ├── <ion-menu>                    # Sidebar (type="overlay")
│   │   ├── HEADER with brand
│   │   │   └── "NetControl" + "ISP Administration"
│   │   ├── Admin card (avatar + name + email)
│   │   ├── Navigation list
│   │   │   ├── Dashboard
│   │   │   ├── Packages
│   │   │   ├── Payments
│   │   │   ├── Sessions
│   │   │   ├── Reports
│   │   │   └── Settings
│   │   ├── Logout button
│   │   └── Footer "System API connected"
│   │
│   └── Main content area
│       ├── <ion-header>
│       │   └── Title: "Network Operations"
│       │   └── Settings button (links to /settings)
│       └── <ion-content>
│           └── <router-outlet>
```

### Hardcoded Branding

| Element | Current Value | File | Type |
|---------|---------------|------|------|
| Sidebar brand name | "NetControl" | admin-layout.html | Text |
| Sidebar brand subtitle | "ISP Administration" | admin-layout.html | Text |
| Header title | "Network Operations" | admin-layout.html | Text |
| Footer status | "System API connected" | admin-layout.html | Text |
| Logo icon | radio-outline (Ionicon) | admin-layout.html | Icon |
| Brand mark bg color | #2dd4bf (cyan) | admin-layout.scss | CSS |
| Primary color | #2563eb (blue) | admin-layout.scss | CSS |

### Menu Items (Hardcoded Array)

```typescript
readonly navItems: NavItem[] = [
  { label: 'Dashboard', route: '/dashboard', icon: 'grid-outline' },
  { label: 'Packages', route: '/packages', icon: 'cube-outline' },
  { label: 'Payments', route: '/payments', icon: 'card-outline' },
  { label: 'Sessions', route: '/sessions', icon: 'pulse-outline' },
  { label: 'Reports', route: '/reports', icon: 'bar-chart-outline' },
  { label: 'Settings', route: '/settings', icon: 'person-outline' }
];
```

### Logged-in Admin Info

```typescript
readonly initials = computed(() => 
  this.auth.admin()?.name
    ?.split(' ')
    .map(part => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'AD'
);

// Displays: {{ auth.admin()?.name }}
//          {{ auth.admin()?.email }}
```

---

# SECTION 8 — ADMIN DASHBOARD

### Files
- Component: `src/app/pages/dashboard/dashboard.page.ts`
- Template: `src/app/pages/dashboard/dashboard.page.html`
- Service: `src/app/services/dashboard.service.ts`
- Model: `src/app/models/dashboard.model.ts`

### API Endpoint
```
GET /api/admin/dashboard
Headers: Authorization: Bearer {token}

Response: {
  success: boolean,
  dashboard: {
    total_packages: number,
    total_payments: number,
    successful_payments: number,
    pending_payments: number,
    active_sessions: number,
    expired_sessions: number,
    total_revenue: number | string
  }
}
```

### Service Code
```typescript
// DashboardService.getDashboard()
this.http.get<DashboardResponse>(`${API_CONFIG.baseUrl}/dashboard`)
```

### Data Flow
```
User navigates to /dashboard
  → DashboardPage constructor calls load()
  → load() sets loading=true, calls dashboardService.getDashboard()
  → HTTP GET /api/admin/dashboard
  → Response stored in stats signal
  → Template renders stats as stat cards
```

### Statistics Displayed

| Card | Label | Icon | Color | Source Field |
|------|-------|------|-------|--------------|
| 1 | Total packages | cube | blue | total_packages |
| 2 | Total payments | card | purple | total_payments |
| 3 | Successful | checkmark-circle | green | successful_payments |
| 4 | Pending | time | orange | pending_payments |
| 5 | Active sessions | wifi | cyan | active_sessions |
| 6 | Expired sessions | refresh | slate | expired_sessions |
| Revenue panel | — | — | gradient | total_revenue (formatted as TZS) |

### Template Notes
- Greeting: "Good day, {admin_first_name}" (from auth.admin().name.split(' ')[0])
- Revenue section shows summary with formatted TZS currency
- All values treated as GLOBAL/SINGLE-COMPANY (no company context)
- Money formatter: `TZS ${value.toLocaleString('en-TZ')}`

---

# SECTION 9 — ADMIN PACKAGES FEATURE

### Files
- Page: `src/app/pages/packages/packages.page.ts`
- Template: `src/app/pages/packages/packages.page.html`
- Service: `src/app/services/package.service.ts`
- Model: `src/app/models/package.model.ts`

### Data Model
```typescript
export interface InternetPackage {
  id: number;
  name: string;
  price: number | string;
  duration_minutes: number;
  speed: string;
  is_active: boolean;
  available_from: string | null;  // ISO datetime or null
  available_until: string | null; // ISO datetime or null
}

export interface PackagePayload {
  name: string;
  price: number;
  duration_minutes: number;
  speed: string;
  is_active?: boolean;
}
```

### API Endpoints

```
GET    /api/admin/packages
       Response: { success: boolean, packages: InternetPackage[] }

POST   /api/admin/packages
       Body: PackagePayload
       Response: { success: boolean, message?, package: InternetPackage }

PATCH  /api/admin/packages/:id
       Body: PackagePayload
       Response: { success: boolean, message?, package: InternetPackage }

PATCH  /api/admin/packages/:id/status
       Body: { is_active: boolean }
       Response: { success: boolean, message?, package: InternetPackage }

PATCH  /api/admin/packages/:id/schedule
       Body: { 
         available_from: string | null,
         available_until: string | null 
       }
       Response: { success: boolean, message?, package: InternetPackage }
```

### Service Methods
```typescript
PackageService {
  getPackages(): Observable<PackageListResponse>
  createPackage(payload: PackagePayload): Observable<PackageResponse>
  updatePackage(id: number, payload: PackagePayload): Observable<PackageResponse>
  setStatus(id: number, isActive: boolean): Observable<PackageResponse>
  setSchedule(id: number, availableFrom, availableUntil): Observable<PackageResponse>
}
```

### Page Features

**Load packages**:
```
ngOnInit() → load()
  → packageService.getPackages()
  → packages signal updated
```

**Search**: Real-time filter by name/speed (computed)

**Create package**:
```
openCreate() → form reset → formOpen=true
  → User fills form → savePackage()
    → packageService.createPackage(formValue)
    → Reload packages list
    → Show toast: "Package created."
```

**Edit package**:
```
openEdit(item) → selected=item → form populated → formOpen=true
  → User edits → savePackage()
    → packageService.updatePackage(item.id, formValue)
    → Reload packages list
    → Show toast: "Package updated."
```

**Toggle status** (activate/deactivate):
```
toggleStatus(item, nextStatus) → UI confirm dialog
  → packageService.setStatus(item.id, nextStatus)
  → Update packages array in-place
  → Show toast
```

**Set availability schedule**:
```
openSchedule(item) → form populated with available_from/until
  → User picks dates → saveSchedule()
    → packageService.setSchedule(item.id, from, until)
    → Reload packages
    → Show toast: "Availability schedule saved."
```

### Assumptions
- ❌ NO company_id sent to API
- ❌ NO company filtering
- ❌ All packages belong to ONE implicit company
- ❌ Backend filters by req.admin.companyId (not visible to frontend)

---

# SECTION 10 — ADMIN PAYMENTS FEATURE

### Files
- Page: `src/app/pages/payments/payments.page.ts`
- Template: `src/app/pages/payments/payments.page.html`
- Service: `src/app/services/payment.service.ts`
- Model: `src/app/models/payment.model.ts`
- Details page: `src/app/pages/payment-details/payment-details.page.ts`

### Data Model
```typescript
export type PaymentStatus = 'pending' | 'successful' | 'failed';

export interface Payment {
  id: number;
  transaction_reference: string;
  phone_number: string;
  payment_method: string;
  amount: number | string;
  status: PaymentStatus;
  created_at: string;
  paid_at: string | null;
  package_id: number;
  package_name: string;
  duration_minutes: number;
  speed: string;
}
```

### API Endpoints

```
GET    /api/admin/payments
       Response: { success: boolean, payments: Payment[] }

GET    /api/admin/payments/:id
       Response: { success: boolean, payment: Payment }

GET    /api/admin/payments/cash-requests
       Response: { success: boolean, cashRequests: CashRequest[] }
       Note: Returns pending cash payment requests

PATCH  /api/admin/payments/cash-requests/:reference/confirm
       Body: {} (empty)
       Response: { success: boolean, payment: Payment }
       Action: Marks cash payment successful + creates internet session

PATCH  /api/admin/payments/:reference/success (dev only)
       Body: {} (empty)
       Response: { success: boolean, payment: Payment }
       Note: Temporary development helper, not for production
```

### Service Methods
```typescript
PaymentService {
  getPayments(): Observable<PaymentListResponse>
  getPayment(id: number): Observable<PaymentResponse>
  getCashRequests(): Observable<any>
  confirmCashPayment(reference: string): Observable<any>
  markSuccessfulForDevelopment(reference: string): Observable<PaymentResponse>
}
```

### Page Features

**View all payments**:
```
Load → paymentService.getPayments()
  → Display in table/cards
  → Columns: Date, Reference, Customer, Amount, Status, Actions
```

**Filter payments**:
- By status (pending/successful/failed)
- By date range
- By payment method

**View single payment**:
```
Click payment → Navigate to /payments/:id
  → paymentService.getPayment(id)
  → Display detail view with full info
```

**Cash payment requests**:
```
getCashRequests() → Show list of pending cash payments
  → Show: Reference, Customer, Amount, Time pending
  → Click "Confirm cash received" → confirmCashPayment(reference)
    → Backend marks payment successful
    → Backend creates internet session
    → Refresh list
```

### Assumptions
- ❌ NO company_id filtering
- ❌ ALL payments from ONE company
- ❌ Backend filters by req.admin.companyId

---

# SECTION 11 — ADMIN INTERNET SESSIONS

### Files
- Page: `src/app/pages/sessions/sessions.page.ts`
- Template: `src/app/pages/sessions/sessions.page.html`
- Service: `src/app/services/session.service.ts`
- Model: `src/app/models/session.model.ts`
- Details page: `src/app/pages/session-details/session-details.page.ts`

### Data Model
```typescript
export type SessionStatus = 'active' | 'suspended' | 'expired' | 'failed' | 'pending_activation';

export interface InternetSession {
  id: number;
  started_at: string;
  expires_at: string;
  status: SessionStatus;
  created_at: string;
  package_id: number;
  package_name: string;
  duration_minutes: number;
  speed: string;
  payment_id: number;
  transaction_reference: string;
  phone_number: string;
  payment_method: string;
  amount: number | string;
  paid_at: string | null;
}
```

### API Endpoints

```
GET    /api/admin/sessions
       Response: { success: boolean, sessions: InternetSession[] }

GET    /api/admin/sessions/:id
       Response: { success: boolean, session: InternetSession }

PATCH  /api/admin/sessions/:id/status
       Body: { status: SessionStatus }
       Response: { success: boolean, message?, session: InternetSession }
       Note: Currently only updates DB, does NOT control MikroTik/router
```

### Service Methods
```typescript
SessionService {
  getSessions(): Observable<SessionListResponse>
  getSession(id: number): Observable<SessionResponse>
  changeStatus(id: number, status: SessionStatus): Observable<SessionResponse>
}
```

### Page Features

**View all sessions**:
```
Load → sessionService.getSessions()
  → Display in table/cards
  → Columns: ID, Customer, Package, Started, Expires, Status
```

**Filter sessions**:
- By status (active/suspended/expired/failed/pending_activation)
- By date range

**View single session**:
```
Click session → Navigate to /sessions/:id
  → sessionService.getSession(id)
  → Display detail with all payment + session info
```

**Change session status**:
```
Click "Suspend" or "Activate" button
  → sessionService.changeStatus(id, newStatus)
  → Update status in display
  → Show confirmation toast
  → Note: Backend only updates DB, MikroTik control commented as "future"
```

### Assumptions
- ❌ NO company_id filtering
- ❌ ALL sessions from ONE company
- ❌ Backend filters by req.admin.companyId
- ❌ MikroTik/router integration NOT implemented (DB only)

---

# SECTION 12 — ADMIN REPORTS

### Files
- Page: `src/app/pages/reports/reports.page.ts`
- Template: `src/app/pages/reports/reports.page.html`
- Service: `src/app/services/report.service.ts`
- Model: `src/app/models/report.model.ts`

### API Endpoints

```
GET    /api/admin/reports/revenue
       Response: {
         success: boolean,
         report/revenue: {
           total_revenue: number,
           revenue_by_date: [
             { date: string, revenue: number }
           ]
         }
       }

GET    /api/admin/reports/payments
       Response: {
         success: boolean,
         report/payments: {
           by_status: [ { status: string, count: number } ],
           by_payment_method: [ { payment_method: string, count: number } ]
         }
       }

GET    /api/admin/reports/sessions
       Response: {
         success: boolean,
         report/sessions: {
           active_sessions: number,
           expired_sessions: number,
           by_status: [ { status: string, count: number } ],
           by_package: [ { package_name: string, count: number } ]
         }
       }
```

### Service Code
```typescript
getReports(): Observable<ReportsBundle> {
  return forkJoin({
    revenueResponse: GET /reports/revenue,
    paymentResponse: GET /reports/payments,
    sessionResponse: GET /reports/sessions
  }).pipe(map(...))
  // Combines three endpoints into one ReportsBundle view model
}
```

### Page Features

**Revenue Report**:
- Total revenue (TZS)
- Chart: Revenue by date
- Bar chart visualization

**Payments Report**:
- Count by status (pending/successful/failed)
- Count by payment method (M-Pesa/Airtel Money/etc)
- Horizontal bar charts

**Sessions Report**:
- Total active sessions
- Total expired sessions
- Count by status
- Count by package
- Bar charts

### Assumptions
- ❌ ALL data from ONE company
- ❌ NO company filtering
- ❌ Backend filters by req.admin.companyId

---

# SECTION 13 — CURRENT SETTINGS / BRANDING

### Settings Page

**File**: `src/app/pages/settings/settings.page.ts`

**Current Functionality**:
```
✅ IMPLEMENTED:
- Display admin name, email
- Display admin account status
- Logout button

❌ NOT IMPLEMENTED:
- Company profile editing
- Company name change
- Logo upload
- Color picker/branding settings
- Company settings
- Image management
```

### Company Branding (Status Check)

| Feature | Status | Location |
|---------|--------|----------|
| Company model exists | ✅ PARTIAL | `admin.model.ts` has Company interface |
| Company service exists | ✅ PARTIAL | `company.service.ts` drafted with branding logic |
| Load company endpoint | ⚠️ DRAFTED | `GET /api/admin/company` (backend may support) |
| Dynamic company name | ❌ NOT IMPL | All references hardcoded "NetControl" |
| Dynamic logo | ❌ NOT IMPL | Icon hardcoded to ionicons radio-outline |
| Dynamic colors | ⚠️ PARTIAL IMPL | CSS variables exist in company.service.ts but never applied |
| Logo upload | ❌ NOT IMPL | No form/modal |
| Color picker | ❌ NOT IMPL | No form |
| CSS variables | ⚠️ EXIST | `--company-primary`, `--company-secondary`, `--company-accent`, etc defined in company.service but never used |

### Hardcoded Branding Assets

| Item | Current Value | File | Change Required |
|------|---------------|------|-----------------|
| App name | "NetControl" | login.page.html, admin-layout.html | Dynamic from company |
| App tagline | "ISP Operations Platform" | login.page.html | Dynamic |
| Copy line | "Your network. Under control." | login.page.html | Dynamic |
| Header title | "Network Operations" | admin-layout.html | Dynamic |
| Sidebar subtitle | "ISP Administration" | admin-layout.html | Dynamic |
| Footer text | "System API connected" | admin-layout.html | Dynamic |
| Logo icon | radio-outline | admin-layout.html, login.page.html | Dynamic/uploaded |
| Primary color | #2563eb | global.scss, admin-layout.scss | CSS variable |
| Accent color | #2dd4bf | admin-layout.scss | CSS variable |
| Token prefix | "isp_admin" | auth.service.ts | Keep or rebrand |

---

# SECTION 14 — ADMIN DATA MODELS

### Admin Model
**File**: `src/app/models/admin.model.ts`
```typescript
export interface Admin {
  id: number;
  name: string;
  email: string;
  is_active?: boolean;
  status?: string;
}
// ❌ NO company_id
// ❌ NO role (role exists in backend but not in this model)

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  admin: Admin;
}

export interface AdminResponse {
  success: boolean;
  admin: Admin;
}
```

### Company Model
**File**: `src/app/models/company.model.ts`
```typescript
export interface CompanyBranding {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  background_color?: string;
  navbar_color?: string;
  background_image_url?: string | null;
  login_image_url?: string | null;
  banner_image_url?: string | null;
}

export interface CompanySettings {
  branding?: CompanyBranding;
}

export interface Company {
  id: number;
  name: string;
  slug: string;
  logo_url?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  status: string;
  settings?: CompanySettings;
}

// ❌ Model exists but NOT USED in any component
// ❌ Never fetched or displayed
```

### Package Model
**File**: `src/app/models/package.model.ts`
```typescript
export interface InternetPackage {
  id: number;
  name: string;
  price: number | string;
  duration_minutes: number;
  speed: string;
  is_active: boolean;
  available_from: string | null;
  available_until: string | null;
}
// ❌ NO company_id
```

### Payment Model
**File**: `src/app/models/payment.model.ts`
```typescript
export type PaymentStatus = 'pending' | 'successful' | 'failed';

export interface Payment {
  id: number;
  transaction_reference: string;
  phone_number: string;
  payment_method: string;
  amount: number | string;
  status: PaymentStatus;
  created_at: string;
  paid_at: string | null;
  package_id: number;
  package_name: string;
  duration_minutes: number;
  speed: string;
}
// ❌ NO company_id
```

### Session Model
**File**: `src/app/models/session.model.ts`
```typescript
export type SessionStatus = 'active' | 'suspended' | 'expired' | 'failed' | 'pending_activation';

export interface InternetSession {
  id: number;
  started_at: string;
  expires_at: string;
  status: SessionStatus;
  created_at: string;
  package_id: number;
  package_name: string;
  duration_minutes: number;
  speed: string;
  payment_id: number;
  transaction_reference: string;
  phone_number: string;
  payment_method: string;
  amount: number | string;
  paid_at: string | null;
}
// ❌ NO company_id
```

### Dashboard Model
**File**: `src/app/models/dashboard.model.ts`
```typescript
export interface DashboardStats {
  total_packages: number;
  total_payments: number;
  successful_payments: number;
  pending_payments: number;
  active_sessions: number;
  expired_sessions: number;
  total_revenue: number | string;
}
// ❌ NO company aggregation info
```

### Report Model
**File**: `src/app/models/report.model.ts`
```typescript
export interface RevenueReport {
  total_revenue: number | string;
  revenue_by_date: { date: string, revenue: number }[];
}

export interface PaymentReport {
  by_status: { status: string, count: number }[];
  by_payment_method: { payment_method: string, count: number }[];
}

export interface SessionReport {
  active_sessions: number;
  expired_sessions: number;
  by_status: { status: string, count: number }[];
  by_package: { package_name: string, count: number }[];
}
// ❌ NO company_id
```

### Summary
**Models found in Version 1**:
- ✅ Admin, LoginRequest, LoginResponse, AdminResponse
- ✅ InternetPackage
- ✅ Payment, PaymentStatus
- ✅ InternetSession, SessionStatus
- ✅ DashboardStats
- ✅ Revenue/Payment/Session Reports
- ✅ Company, CompanyBranding, CompanySettings (DEFINED but NOT USED)

**Missing from all models**:
- ❌ company_id / companyId field
- ❌ Admin.role field (backend has it, frontend doesn't)
- ❌ Any tenant/company context

---

# SECTION 15 — ADMIN API CONFIGURATION

### Central Config File
**File**: `src/app/config/api.config.ts`
```typescript
export const API_CONFIG = {
  baseUrl: 'http://localhost:4000/api/admin'
} as const;
```

### Usage
```typescript
// Imported in all services
import { API_CONFIG } from '../config/api.config';

// Used like:
`${API_CONFIG.baseUrl}/auth/login`         → http://localhost:4000/api/admin/auth/login
`${API_CONFIG.baseUrl}/dashboard`          → http://localhost:4000/api/admin/dashboard
`${API_CONFIG.baseUrl}/packages`           → http://localhost:4000/api/admin/packages
`${API_CONFIG.baseUrl}/payments`           → http://localhost:4000/api/admin/payments
`${API_CONFIG.baseUrl}/sessions`           → http://localhost:4000/api/admin/sessions
`${API_CONFIG.baseUrl}/reports`            → http://localhost:4000/api/admin/reports
```

### URL Occurrences in Admin-App
| URL | File | Count |
|-----|------|-------|
| `http://localhost:4000/api/admin/company` | company.service.ts | 1 (hardcoded) |
| `http://localhost:4000/api/admin` | api.config.ts | 1 (central) |
| `${API_CONFIG.baseUrl}` | auth.service.ts | 1 (/auth/login) |
| `${API_CONFIG.baseUrl}` | auth.service.ts | 1 (/auth/me) |
| `${API_CONFIG.baseUrl}` | dashboard.service.ts | 1 (/dashboard) |
| `${API_CONFIG.baseUrl}` | package.service.ts | 5 (/packages, /packages/:id, /packages/:id/status, /packages/:id/schedule) |
| `${API_CONFIG.baseUrl}` | payment.service.ts | 4 (/payments, /payments/:id, /payments/cash-requests, /payments/cash-requests/:ref/confirm) |
| `${API_CONFIG.baseUrl}` | session.service.ts | 3 (/sessions, /sessions/:id, /sessions/:id/status) |
| `${API_CONFIG.baseUrl}` | report.service.ts | 3 (/reports/revenue, /reports/payments, /reports/sessions) |

### Environment Config
**Files**: `src/environments/environment.ts` and `environment.prod.ts`
- Currently NOT used for API configuration
- API_CONFIG is hardcoded in app

---

# SECTION 16 — CUSTOMER-PORTAL VERSION 1 ARCHITECTURE

### Current State: SINGLE-COMPANY, NO TENANT RESOLUTION

**The customer-portal is built for ONE company's public package checkout.**

**Current Assumptions**:
- Portal serves ONE company's packages (hardcoded/implicit)
- NO company slug/slug resolution
- NO tenant context routing
- NO ability to switch companies
- NO company branding (hardcoded Y4C WiFi)
- Customer DOES NOT log in

### Tech Stack

| Component | Version | Notes |
|-----------|---------|-------|
| **Angular** | 22.1.0 | Latest standalone |
| **TypeScript** | 6.0.2 | Latest |
| **RxJS** | 7.8.0 | Reactive |
| **Forms** | Reactive | FormControl, FormGroup |
| **HTTP** | HttpClient | No auth interceptor |
| **State** | Signals + sessionStorage | No NgRx |
| **Styling** | Tailwind CSS 4.1.12 | Utility-first CSS |
| **UI Icons** | Ionicons (implied) | Via components |
| **Storage** | sessionStorage | Session-only |

### Routes

| Path | Component | Lazy Load | Notes |
|------|-----------|-----------|-------|
| `` (root) | — | — | Redirects to /packages |
| `/packages` | PackagesPageComponent | Yes | List active packages |
| `/payment/:packageId` | PaymentPageComponent | Yes | Choose payment method + initiate |
| `/payment-success/:reference` | PaymentSuccessPageComponent | Yes | Confirmation page |
| `/session/:id` | SessionStatusPageComponent | Yes | Active session display |
| `/expired` | ExpiredPageComponent | Yes | Expired session notice |
| `/cash-payment/:packageId` | CashPaymentPageComponent | Yes | Cash payment form |
| `/cash-payment-status/:reference` | CashPaymentStatusPageComponent | Yes | Cash payment polling |
| `**` | — | — | Redirects to /packages |

### Branding (Customer Portal)

**Hardcoded to "Y4C WiFi"**:
| Element | Value | File |
|---------|-------|------|
| Brand name | "Y4C WiFi" | app.html |
| Brand mark | "Y4C" | app.html |
| Page titles | "... \| Y4C WiFi" | app.routes.ts |
| Session storage keys | "y4c-selected-package", "y4c-payment-success" | service files |

---

# SECTION 17 — CUSTOMER PORTAL COMPLETE CURRENT FLOW

### Flow Diagram (Version 1)

```
[User visits portal]
    ↓
[/packages route]
    ↓ packageService.getPackages()
GET /api/public/packages
    ↓ (NO COMPANY CONTEXT)
[Packages loaded]
    ↓
[User clicks package card]
    ↓ navigate(/payment/:packageId)
    ↓ packageService.selectPackage(pkg)
[/payment/:packageId]
    ↓ packageService.getPackageById(packageId)
[Load package details]
    ↓ User fills payment form (method + phone)
    ↓ User clicks "Pay Now"
    ↓ paymentService.initiatePayment({package_id, payment_method, phone_number})
POST /api/public/payments/initiate
    ↓ (NO COMPANY CONTEXT)
[Payment initiated, reference returned]
    ↓ [Polling starts] every 5 seconds
    ↓ GET /api/public/payments/:reference/status
    ↓ (Poll max 24 times, timeout after 2 minutes)
    ↓
[Payment successful OR timeout]
    ↓
[Navigate to /payment-success/:reference]
    ↓
[Display confirmation + session details]
    ↓
[User can click to view /session/:id]
    ↓ sessionService.getSession(id)
GET /api/public/sessions/:id
    ↓ (NO COMPANY CONTEXT)
[Display session status]
```

### Detailed Step Breakdown

**Step 1: Packages Load**
```
PackagesPageComponent.ngOnInit()
  → packageService.getPackages()
    → GET http://localhost:4000/api/public/packages
    → Response: { success, packages: [] }
  → filter is_active !== false
  → Show 4 packages (slice(0, 4))
  → Errors: Show fallback MOCK_PACKAGES if USE_PACKAGE_FALLBACK=true
```

**Step 2: Choose Package**
```
PackagesPageComponent.choosePackage(pkg)
  → packageService.selectPackage(pkg)
    → Signal updated
    → sessionStorage 'y4c-selected-package' = JSON(pkg)
  → router.navigate(['/payment', pkg.id])
```

**Step 3: Payment Page Load**
```
PaymentPageComponent.ngOnInit()
  → Get packageId from route params
  → If invalid → error message
  → packageService.getPackageById(packageId)
    → Returns from signal OR calls getPackages() + find
  → Load payment methods list (hardcoded):
    [
      { id: 'mpesa', name: 'M-Pesa', color: '#1f8f3a' },
      { id: 'airtel_money', name: 'Airtel Money', color: '#db1f2a' },
      { id: 'mixx_by_yas', name: 'Mixx by Yas', color: '#7540a6' },
      { id: 'halopesa', name: 'HaloPesa', color: '#ef7d16' }
    ]
```

**Step 4: User Selects Payment Method + Phone**
```
Form validation:
  - paymentMethod: required
  - phoneNumber: required, pattern /^(?:\+?255|0)[67]\d{8}$/
    (Tanzania mobile numbers: 06/07 local or +255 international)

initiatePayment():
  → Sanitize phone (remove spaces/dashes)
  → paymentService.initiatePayment({
      package_id: packageItem.id,
      payment_method: formValue.paymentMethod,
      phone_number: normalizePhone(formValue.phoneNumber)
    })
    → POST http://localhost:4000/api/public/payments/initiate
    → Body: { package_id, payment_method, phone_number }
    → Response: { 
        success: boolean,
        payment: {
          transaction_reference: string,
          ...
        }
      }
```

**Step 5: Payment Status Polling**
```
After successful initiation:
  → reference = response.payment.transaction_reference
  → Set waiting=true
  → Polling starts:
    interval(5000).pipe(
      startWith(0),  // Start immediately
      switchMap(() => paymentService.getPaymentStatus(reference)),
      takeUntil(stopCondition)
    )
  → For each poll:
    GET /api/public/payments/:reference/status
    → Check status field
    → If status === 'successful':
        - paymentService.rememberSuccess(details)
        - sessionStorage 'y4c-payment-success' = JSON(details)
        - navigate(/payment-success/:reference)
        - Stop polling
    → If poll count >= MAX_PAYMENT_POLLS (24):
        - timedOut=true
        - Stop polling
        - Show timeout message
```

**Step 6: Payment Success**
```
PaymentSuccessPageComponent
  → Get reference from route params
  → Display payment confirmation
  → Show session ID for customer to view later
  → Link to /session/:id
```

**Step 7: View Session Status**
```
SessionStatusPageComponent.ngOnInit()
  → Get session ID from route params
  → sessionService.getSession(id)
    → GET /api/public/sessions/:id
    → Response: { success, session: InternetSession }
  → Display:
    - Status badge
    - Session expiry time
    - Package details
    - Payment info
```

**Step 8: Cash Payment (Alternative)**
```
CashPaymentPageComponent
  → User enters phone number
  → paymentService.initiateCashPayment({
      package_id: id,
      phone_number: phone
    })
    → POST /api/public/payments/cash-request
  → Returns reference
  → Navigate to /cash-payment-status/:reference

CashPaymentStatusPageComponent
  → Poll /api/public/payments/:reference/status
  → Wait for admin to confirm cash received
  → When status changes to 'successful':
    - Show session details
    - Customer can now use internet
```

### API Endpoints Called (Version 1)

| Method | URL | Purpose | Params |
|--------|-----|---------|--------|
| GET | `/api/public/packages` | Load packages | None (NO company) |
| POST | `/api/public/payments/initiate` | Start mobile payment | package_id, payment_method, phone_number |
| GET | `/api/public/payments/:reference/status` | Poll payment status | reference (path) |
| POST | `/api/public/payments/cash-request` | Create cash payment request | package_id, phone_number |
| GET | `/api/public/sessions/:id` | Get session details | id (path) |

### Current Assumptions
- ✅ ALL packages from ONE company
- ✅ ALL payments to ONE company
- ✅ ALL sessions from ONE company
- ❌ NO company slug in URL
- ❌ NO tenant resolution
- ❌ NO company ID passed anywhere
- ❌ NO company branding loading

---

# SECTION 18 — CUSTOMER PORTAL CURRENT BRANDING

### Hardcoded Brand Assets

| Element | Value | File | CSS Var? |
|---------|-------|------|----------|
| Portal name | "Y4C WiFi" | app.html | No |
| Brand mark | "Y4C" | app.html | No |
| Logo icon | Y4C text mark | app.html | No |
| Page title prefix | "Y4C WiFi" | app.routes.ts | No |
| Storage key prefix | "y4c-" | service files | No |

### Global Styling Files

| File | Purpose |
|------|---------|
| `src/styles.css` | Global styles |
| Component `.css` files | Scoped styles per component |

### CSS Variables / Theme

**NOT IMPLEMENTED** — No theme/branding CSS variables found.

Hardcoded color scheme (implied from component styling):
- Primary: Blue (Tailwind default)
- Accent: Green
- Error: Red
- Info: Cyan

---

# SECTION 19 — CURRENT CUSTOMER TENANT CONTEXT

### Search Results for Tenant Resolution

| Term | Count | Found In | Status |
|------|-------|----------|--------|
| company | 0 | Service/Component code | ❌ MISSING |
| company_id | 0 | Service/Component code | ❌ MISSING |
| companyId | 0 | Service/Component code | ❌ MISSING |
| tenant | 0 | Service/Component code | ❌ MISSING |
| slug | 0 | Service/Component code | ❌ MISSING |
| router query params | 0 | Route handlers | ❌ MISSING |
| route params | 0 (except :packageId) | Route handlers | ❌ NO COMPANY |
| localStorage/sessionStorage | ✅ y4c-* keys | service files | ✅ exists but hardcoded |
| MikroTik | 0 | Components | ❌ MISSING |
| mikrotik | 0 | Components | ❌ MISSING |
| MAC address | 0 | Components | ❌ MISSING |
| mac_address | 0 | Components | ❌ MISSING |
| ip_address | 0 | Components | ❌ MISSING |
| link-login | 0 | Components | ❌ MISSING |
| link-orig | 0 | Components | ❌ MISSING |
| chap-id | 0 | Components | ❌ MISSING |
| chap-challenge | 0 | Components | ❌ MISSING |
| RouterOS | 0 | Components | ❌ MISSING |
| hotspot | 0 | Components | ❌ MISSING |
| captive | 0 | Components | ❌ MISSING |

### Conclusion
**Customer portal Version 1 currently has NO implemented tenant resolution.**

The portal:
- ❌ Does NOT know which company it's serving
- ❌ Does NOT resolve company from URL slug
- ❌ Does NOT detect company from query parameters
- ❌ Does NOT resolve company from router context
- ❌ Does NOT load company branding
- ❌ Does NOT handle multiple company portals
- ✅ Calls global /api/public/packages (backend must handle company somehow)

---

# SECTION 20 — MIKROTIK / ROUTER FRONTEND CONTEXT

### Search Results

| Term | Found In | Status |
|------|----------|--------|
| MikroTik | None (admin or customer portal) | ❌ NOT IMPLEMENTED |
| mikrotik | None | ❌ NOT IMPLEMENTED |
| RouterOS | None | ❌ NOT IMPLEMENTED |
| hotspot | None | ❌ NOT IMPLEMENTED |
| captive | None | ❌ NOT IMPLEMENTED |
| MAC address | None | ❌ NOT IMPLEMENTED |
| mac_address | None | ❌ NOT IMPLEMENTED |
| ip_address | None | ❌ NOT IMPLEMENTED |
| link-login | None | ❌ NOT IMPLEMENTED |
| link-orig | None | ❌ NOT IMPLEMENTED |
| chap-id | None | ❌ NOT IMPLEMENTED |
| chap-challenge | None | ❌ NOT IMPLEMENTED |

### Current Status
**NEITHER frontend has any MikroTik/router integration.**

Backend session controller comment:
```
"This currently changes PostgreSQL state only. 
Future MikroTik/router activation should be coordinated by the backend behind this same API contract."
```

---

# SECTION 21 — BACKEND CURRENT CONTRACTS USED BY FRONTENDS

### Admin Auth

**ENDPOINT**: `POST /api/admin/auth/login`
```
Controller: admin/auth.controller.js → loginAdmin()
Middleware: None (public)
Request: { email, password }
Response: {
  success: boolean,
  message: string,
  token: string (JWT),
  admin: {
    id: number,
    company_id: number (for "admin" role only),
    name: string,
    email: string,
    role: "admin" | "superadmin",
    status: string,
    is_active: boolean
  }
}
Status: ✅ EXISTS
```

**ENDPOINT**: `GET /api/admin/auth/me`
```
Controller: admin/auth.controller.js → getCurrentAdmin()
Middleware: adminAuth (JWT required)
Request: None (JWT in header)
Response: {
  success: boolean,
  admin: { id, name, email, is_active, status }
}
Status: ✅ EXISTS
```

### Admin Packages

**ENDPOINT**: `GET /api/admin/packages`
```
Controller: admin/package.controller.js → getPackages()
Middleware: adminAuth
Params: None
Response: { success, packages: [] }
Filters: By req.admin.companyId (backend enforces)
Status: ✅ EXISTS
```

**ENDPOINT**: `POST /api/admin/packages`
**ENDPOINT**: `PATCH /api/admin/packages/:id`
**ENDPOINT**: `PATCH /api/admin/packages/:id/status`
**ENDPOINT**: `PATCH /api/admin/packages/:id/schedule`
```
All exist and filter by req.admin.companyId
Status: ✅ ALL EXIST
```

### Admin Payments

**ENDPOINT**: `GET /api/admin/payments`
**ENDPOINT**: `GET /api/admin/payments/:id`
**ENDPOINT**: `GET /api/admin/payments/cash-requests`
**ENDPOINT**: `PATCH /api/admin/payments/cash-requests/:reference/confirm`
```
All exist and filter by req.admin.companyId
Status: ✅ ALL EXIST
```

### Admin Sessions

**ENDPOINT**: `GET /api/admin/sessions`
**ENDPOINT**: `GET /api/admin/sessions/:id`
**ENDPOINT**: `PATCH /api/admin/sessions/:id/status`
```
All exist and filter by req.admin.companyId
Status: ✅ ALL EXIST
```

### Admin Dashboard

**ENDPOINT**: `GET /api/admin/dashboard`
```
Controller: admin/dashboard.controller.js → getDashboard()
Middleware: adminAuth
Aggregates by req.admin.companyId
Status: ✅ EXISTS
```

### Admin Reports

**ENDPOINT**: `GET /api/admin/reports/revenue`
**ENDPOINT**: `GET /api/admin/reports/payments`
**ENDPOINT**: `GET /api/admin/reports/sessions`
```
All exist and filter by req.admin.companyId
Status: ✅ ALL EXIST
```

### Company Profile (Admin)

**ENDPOINT**: `GET /api/admin/company`
```
Controller: admin/companyProfile.controller.js
Middleware: adminAuth
Returns: Authenticated admin's company profile
Status: ✅ EXISTS (but frontend NOT using it)
```

### Public Packages (FOR CUSTOMER PORTAL)

**ENDPOINT**: `GET /api/public/packages` (OLD - DEPRECATED)
```
Status: ❌ DOES NOT EXIST (frontend still calling it!)
Backend only has: GET /api/public/companies/:companySlug/packages
```

**ENDPOINT**: `GET /api/public/companies/:companySlug/packages` (NEW)
```
Controller: public/package.controller.js → getPublicPackages()
Middleware: None
Params: companySlug
Returns: { success, company: {...}, packages: [] }
Status: ✅ EXISTS (frontend NOT using it)
```

### Public Payments (FOR CUSTOMER PORTAL)

**ENDPOINT**: `POST /api/public/payments/initiate` (OLD - DEPRECATED)
```
Status: ❌ DOES NOT EXIST
Backend only has: POST /api/public/companies/:companySlug/payments/initiate
```

**ENDPOINT**: `POST /api/public/companies/:companySlug/payments/initiate` (NEW)
```
Controller: public/payment.controller.js → initiatePayment()
Middleware: None
Params: companySlug
Body: { package_id, payment_method, phone_number }
Status: ✅ EXISTS (frontend NOT using it)
```

### Public Sessions (FOR CUSTOMER PORTAL)

**ENDPOINT**: `GET /api/public/sessions/:id` (OLD - DEPRECATED)
```
Status: ❌ DOES NOT EXIST
Backend only has: GET /api/public/companies/:companySlug/sessions/:id
```

**ENDPOINT**: `GET /api/public/companies/:companySlug/sessions/:id` (NEW)
```
Controller: public/session.controller.js → getPublicSessionById()
Middleware: None
Params: companySlug, id
Status: ✅ EXISTS (frontend NOT using it)
```

### Super Admin (NOT USED BY FRONTEND)

**ENDPOINT**: `GET /api/super-admin/admins`
**ENDPOINT**: `POST /api/super-admin/admins`
**ENDPOINT**: `PATCH /api/super-admin/admins/:id/suspend`
**ENDPOINT**: `PATCH /api/super-admin/admins/:id/activate`
**ENDPOINT**: `DELETE /api/super-admin/admins/:id`
```
All exist in backend but NO frontend UI
Status: ✅ EXIST (backend only)
```

### Platform Company Management (NOT USED BY FRONTEND)

**ENDPOINT**: `GET /api/platform/companies`
**ENDPOINT**: `POST /api/platform/companies`
**ENDPOINT**: `PATCH /api/platform/companies/:id`
**ENDPOINT**: And many more...
```
Platform superadmin company management endpoints
Status: ✅ EXIST (backend only)
```

---

# SECTION 22 — VERSION 1 FRONTEND VS MULTI-TENANT BACKEND MISMATCH

### Critical Mismatches

| Component | Frontend Behavior | Backend Endpoint | Match? | Issue |
|-----------|-------------------|-----------------|--------|-------|
| **Admin Packages** | GET /api/admin/packages (no slug) | GET /api/admin/packages (filters by JWT company_id) | ✅ YES | Works but frontend unaware of filtering |
| **Admin Payments** | GET /api/admin/payments (no slug) | GET /api/admin/payments (filters by JWT company_id) | ✅ YES | Works but frontend unaware of filtering |
| **Admin Sessions** | GET /api/admin/sessions (no slug) | GET /api/admin/sessions (filters by JWT company_id) | ✅ YES | Works but frontend unaware of filtering |
| **Admin Dashboard** | GET /api/admin/dashboard (no slug) | GET /api/admin/dashboard (filters by JWT company_id) | ✅ YES | Works but frontend unaware of filtering |
| **Admin Reports** | GET /api/admin/reports/* (no slug) | GET /api/admin/reports/* (filters by JWT company_id) | ✅ YES | Works but frontend unaware of filtering |
| **Customer Packages** | GET /api/public/packages (no company) | GET /api/public/companies/:slug/packages (REQUIRES slug) | ❌ NO | BROKEN - Frontend not passing slug |
| **Customer Payments** | POST /api/public/payments/initiate (no company) | POST /api/public/companies/:slug/payments/initiate (REQUIRES slug) | ❌ NO | BROKEN - Frontend not passing slug |
| **Customer Sessions** | GET /api/public/sessions/:id (no company) | GET /api/public/companies/:slug/sessions/:id (REQUIRES slug) | ❌ NO | BROKEN - Frontend not passing slug |
| **Customer Payment Status** | GET /api/public/payments/:ref/status (no company) | GET /api/public/companies/:slug/payments/:ref/status (REQUIRES slug) | ❌ NO | BROKEN - Frontend not passing slug |
| **Admin Response Shape** | Admin model: { id, name, email, is_active, status } | Login response includes: { id, company_id, role, status, is_active, created_at } | ⚠️ PARTIAL | Frontend model missing company_id, role |
| **Admin Login JWT** | Not examined | Backend creates JWT with adminId | ✅ YES | Works, verified by middleware |
| **Company Profile** | NO endpoint called | GET /api/admin/company EXISTS | ❌ NO | Frontend never loads company branding |
| **Company Branding** | NOT IMPLEMENTED | Backend returns company.settings.branding | ❌ NO | Frontend never applies company colors |

### Response Shape Mismatches

**Login Response**:
```
Frontend expects:
{
  success: boolean,
  message: string,
  token: string,
  admin: {
    id: number,
    name: string,
    email: string,
    is_active?: boolean,
    status?: string
  }
}

Backend returns (based on controller):
{
  success: boolean,
  message: string,
  token: string,
  admin: {
    id: number,
    company_id: number,    ← Frontend doesn't capture!
    name: string,
    email: string,
    role: "admin"|"superadmin",    ← Frontend doesn't capture!
    status: string,
    is_active: boolean,
    created_at: string     ← Frontend doesn't capture!
  }
}
```

**Frontend should update Admin model to include**:
- `company_id?: number | null`
- `role?: "admin" | "superadmin"`

---

# SECTION 23 — EXACT FILES TO MODIFY FOR MULTI-TENANT REFACTOR

## PART 6A — Convert admin-app to company-aware

### Goal
Normal Admin loads their own company from backend → dynamic branding, profile, colors

### FILES TO MODIFY

**Models** (Add company_id and role):
```
admin-app/src/app/models/admin.model.ts
  ├── Add company_id?: number | null
  └── Add role?: "admin" | "superadmin"

admin-app/src/app/models/company.model.ts
  └── Already exists, no changes needed
```

**Services**:
```
admin-app/src/app/services/auth.service.ts
  ├── Capture company_id from login response
  ├── Capture role from login response
  └── Add getAdminCompanyId() method

admin-app/src/app/services/company.service.ts
  ├── FINISH IMPLEMENTATION (currently partial)
  ├── Call GET /api/admin/company on admin app init
  ├── Implement applyBranding() to set CSS variables
  ├── Track company signal through app lifetime
  └── Clear company on logout

admin-app/src/app/services/ui.service.ts
  └── Already exists (toasts/dialogs)
```

**Components**:
```
admin-app/src/app/layout/admin-layout/admin-layout.component.ts
  ├── Inject companyService
  ├── Load company on init via loadCurrentAdmin()
  ├── Display company.name instead of hardcoded "NetControl"
  ├── Display company branding (colors, logo)
  └── Update navItems based on admin.role

admin-app/src/app/layout/admin-layout/admin-layout.component.html
  ├── {{ company()?.name || 'NetControl' }}
  ├── Conditional logo display
  └── Conditional menu items (hide/show based on role)

admin-app/src/app/pages/login/login.page.ts
  ├── Already works (no changes needed)
  └── Response now includes company_id

admin-app/src/app/pages/login/login.page.html
  ├── Make branding dynamic (company name, tagline)
  └── Load company logo if exists
```

**New Components**:
```
admin-app/src/app/pages/settings/settings.page.ts
  ├── EXPAND beyond admin profile
  ├── Add company profile section
  ├── Show company name, slug, email, phone, address
  └── Show company status

admin-app/src/app/pages/settings/
  ├── company-profile/ (new folder)
  │   ├── company-profile.component.ts
  │   ├── company-profile.component.html
  │   └── company-profile.component.scss
  ├── company-branding/ (new folder)
  │   ├── company-branding.component.ts
  │   ├── company-branding.component.html
  │   └── company-branding.component.scss
  └── company-logo-upload/ (new folder)
      ├── company-logo-upload.component.ts
      ├── company-logo-upload.component.html
      └── company-logo-upload.component.scss
```

**Guards**:
```
admin-app/src/app/guards/auth.guard.ts
  └── Already works (no changes needed)

admin-app/src/app/guards/role.guard.ts (NEW)
  └── Create canActivateFn to check admin.role === "admin"
```

**Routes**:
```
admin-app/src/app/app.routes.ts
  ├── Keep existing admin routes
  ├── Keep settings route
  └── Conditional: Add super-admin routes IF role === "superadmin"
      (separate section for Part 7)
```

### FILES TO CREATE

```
admin-app/src/app/services/company-branding.service.ts
  ├── Apply CSS variables from company.settings.branding
  ├── Load images (logo, backgrounds)
  └── Watch company changes

admin-app/src/app/pages/settings/company-profile/company-profile.component.*
  ├── Display company details
  ├── Form to edit (if admin is owner)
  └── Show logo/branding

admin-app/src/app/pages/settings/company-branding/company-branding.component.*
  ├── Color picker for primary, secondary, accent
  ├── Live preview
  └── Save to backend

admin-app/src/app/pages/settings/company-logo-upload/company-logo-upload.component.*
  ├── File upload for logo
  ├── Image preview
  └── Save via multipart/form-data
```

### HARDCODED CODE TO REMOVE

```
admin-layout.component.html:
  <strong>NetControl</strong>           → {{ company()?.name || 'NetControl' }}
  <small>ISP Administration</small>     → {{ company()?.settings?.branding?.tagline || 'ISP Administration' }}
  <ion-title>Network Operations</ion-title>  → {{ headerTitle() }}
  Footer "System API connected"         → {{ apiStatus }}

login.page.html:
  <strong>NetControl</strong>           → {{ company()?.name || 'NetControl' }}
  "ISP OPERATIONS PLATFORM"             → {{ company()?.settings?.branding?.tagline }}
  "Your network. Under control."        → {{ company()?.settings?.branding?.tagline2 }}

login.page.ts:
  Form placeholder: "admin@example.com" → {{ company()?.email || 'admin@example.com' }}
```

### EXISTING SERVICES TO REUSE/MODIFY

```
✅ auth.service.ts — Extend with company_id capture
✅ http.client — Reuse for company API calls
✅ signals — Reuse for company state management
✅ ui.service.ts — Reuse for confirmations
```

### EXISTING ROUTES TO KEEP

```
✅ /login
✅ /dashboard
✅ /packages
✅ /payments
✅ /payments/:id
✅ /sessions
✅ /sessions/:id
✅ /reports
✅ /settings (modify to add company profile)
```

### EXISTING ROUTES TO ADD

```
→ /settings/company-profile (new child)
→ /settings/company-branding (new child)
→ /settings/company-logo (new child)
```

---

## PART 6B — Convert customer-portal to tenant-aware

### Goal
Portal determines which company's packages to load → dynamic URL → company-scoped routes

### HOW TENANT IS DETERMINED

**Option 1**: URL slug in route
```
/packages?company=acme-wifi
/packages?slug=acme-wifi
```

**Option 2**: Routing
```
/:companySlug/packages
/:companySlug/payment/:packageId
```

**Option 3**: Subdomain (requires backend DNS)
```
acme.y4c-wifi.net/packages
```

**Recommendation**: Use URL slug as query parameter (easiest, no DNS needed)

### FILES TO MODIFY

**Config**:
```
customer-portal/src/app/config/api.config.ts
  ├── Add COMPANY_SLUG or function to get it
  └── Build URLs dynamically: /companies/${slug}/packages
```

**Services**:
```
customer-portal/src/app/services/package.service.ts
  ├── Add companySlug parameter to all methods
  ├── Call GET /api/public/companies/:slug/packages
  ├── Load company profile (branding)
  └── Cache company info

customer-portal/src/app/services/payment.service.ts
  ├── Add companySlug parameter
  ├── Call POST /api/public/companies/:slug/payments/initiate
  ├── Call GET /api/public/companies/:slug/payments/:ref/status
  └── Call POST /api/public/companies/:slug/payments/cash-request

customer-portal/src/app/services/session.service.ts
  ├── Add companySlug parameter
  ├── Call GET /api/public/companies/:slug/sessions/:id
  └── Load session with company context

customer-portal/src/app/services/company.service.ts (NEW)
  ├── Resolve company from URL
  ├── Load company profile
  ├── Apply company branding
  └── Provide company signal
```

**Routes**:
```
customer-portal/src/app/app.routes.ts
  ├── Change routes to include slug (if using Option 2)
  │   FROM: /packages
  │   TO:   /:companySlug/packages
  OR
  ├── Keep routes same, add slug as query param
```

**Components**:
```
customer-portal/src/app/app.html
  ├── {{ company()?.name || 'Y4C WiFi' }}
  ├── Display company logo if exists
  └── Apply company colors

customer-portal/src/app/pages/packages/packages.ts
  ├── Get company slug from route/query
  ├── Pass to packageService.getPackages(slug)
  └── Display company info

customer-portal/src/app/pages/payment/payment.ts
  ├── Get company slug from route/query
  ├── Pass slug to all payment service calls
  └── Display company branding

customer-portal/src/app/pages/session-status/session-status.ts
  ├── Get company slug from route/query
  ├── Pass slug to sessionService.getSession(slug, id)
  └── Display company info

customer-portal/src/app/pages/cash-payment/cash-payment.ts
  ├── Get company slug from route/query
  ├── Pass slug to payment service
  └── Display company name
```

### NEW COMPONENTS/SERVICES

```
customer-portal/src/app/services/tenant-resolver.service.ts (NEW)
  ├── Extract companySlug from route/query params
  ├── Validate slug format
  ├── Cache resolved company
  └── Provide companySlug() signal

customer-portal/src/app/services/company-branding.service.ts (NEW)
  ├── Load company profile from backend
  ├── Apply CSS variables (colors, images)
  └── Watch slug changes
```

### ROUTES TO MODIFY

**If using URL slug (Option 2)**:
```
OLD:  /packages
NEW:  /:companySlug/packages

OLD:  /payment/:packageId
NEW:  /:companySlug/payment/:packageId

OLD:  /payment-success/:reference
NEW:  /:companySlug/payment-success/:reference

OLD:  /session/:id
NEW:  /:companySlug/session/:id

OLD:  /cash-payment/:packageId
NEW:  /:companySlug/cash-payment/:packageId
```

**If using query param (Option 1)** — Routes stay same, slug from queryParams

### HARDCODED BRANDING TO REMOVE

```
app.html:
  "Y4C WiFi"                  → {{ company()?.name || 'Y4C WiFi' }}

app.routes.ts:
  "Y4C WiFi"                  → {{ company()?.name | async }}

service files:
  "y4c-selected-package"      → `${company().slug}-selected-package`
  "y4c-payment-success"       → `${company().slug}-payment-success`
```

### EXISTING PATTERNS TO REUSE

```
✅ sessionStorage for selected package (update key)
✅ Signal-based state management
✅ RxJS observables for async operations
✅ Routing patterns (update with slug)
```

---

## PART 7 — Convert Super Admin UI (Version 1 UI to Platform Superadmin UI)

### Goal
Repurpose Version 1 Super Admin management UI for platform company management

### STATUS
Currently: Zero Super Admin UI exists in frontend
Need: Brand new Super Admin dashboard + company management pages

### ROUGH OUTLINE (Not detailed, as it's Part 7)

```
Super Admin Routes (add to app.routes.ts):
  /super-admin/
    dashboard/         — Platform overview
    companies/         — List companies
    companies/:id/     — Company details + manage admins
    companies/:id/admins/     — Company's admin list
    admins/ (global)   — All admins across all companies
    system-control/    — System status + suspend/activate

Pages to create:
  /pages/super-admin/
    dashboard/
    companies-list/
    company-detail/
    company-admins/
    global-admin-management/
    system-control/
```

**Note**: Full Part 7 spec in separate detailed section

---

# SECTION 24 — PRESERVE EXISTING WORK

### Components That Can Be Adapted (NOT Rewritten)

```
✅ LoginPage
  → Add company branding display
  → Rest of form logic unchanged

✅ DashboardPage
  → Keep stat cards
  → Keep revenue display
  → Already filters by company (backend)

✅ PackagesPage
  → Keep package form
  → Keep search/filter
  → Keep CRUD logic
  → Backend already filters by company

✅ PaymentsPage
  → Keep payment table
  → Keep cash request handling
  → Keep payment status logic
  → Backend already filters by company

✅ SessionsPage
  → Keep session table
  → Keep status change logic
  → Backend already filters by company

✅ ReportsPage
  → Keep charts/visualizations
  → Keep date filtering
  → Backend already filters by company

✅ Auth Interceptor
  → Keep JWT handling
  → Keep 401 logout logic
  → Add company_id capture if needed

✅ Auth Guard
  → Keep route protection
  → May add role guards (Part 7)
```

### Services That Can Be Extended (NOT Replaced)

```
✅ AuthService
  → Add company_id capture
  → Add role field
  → Rest stays same

✅ DashboardService
  → Pass slug parameter (customer portal only)
  → Logic unchanged

✅ PackageService
  → Pass slug parameter (customer portal only)
  → Logic unchanged (admin unchanged)

✅ PaymentService
  → Pass slug parameter (customer portal only)
  → Logic unchanged (admin unchanged)

✅ SessionService
  → Pass slug parameter (customer portal only)
  → Logic unchanged (admin unchanged)

✅ ReportService
  → Already multi-company aware (backend)
  → No frontend changes needed

✅ UiService
  → Confirm dialogs
  → Toast notifications
  → No changes needed
```

### What NOT to Rewrite

```
❌ Do NOT rewrite form validation
❌ Do NOT rewrite table sorting/filtering (client-side)
❌ Do NOT rewrite HTTP interceptor core logic
❌ Do NOT rewrite auth flow (extend it)
❌ Do NOT rewrite route guards (extend them)
❌ Do NOT rewrite modal/dialog patterns
❌ Do NOT rewrite styling/SCSS (add branding variables)
❌ Do NOT rewrite icon usage (keep Ionicons)
❌ Do NOT rewrite RxJS patterns (extend them)
```

---

# SECTION 25 — CURRENT STATUS TABLE

| Feature | Backend | Admin-App v1 | Customer-Portal v1 | Refactor Needed |
|---------|---------|--------------|-------------------|-----------------|
| Authentication | ✅ COMPLETE | ✅ WORKS | ❌ N/A (no login) | ✅ Admin: capture company_id/role |
| Roles (admin/superadmin) | ✅ COMPLETE | ❌ IGNORED | ❌ N/A | ✅ Admin: display role, guard routes |
| Multiple companies | ✅ COMPLETE | ❌ SINGLE | ❌ SINGLE | ✅ BOTH: multi-company architecture |
| Tenant isolation (DB) | ✅ COMPLETE | ❌ UNAWARE | ❌ UNAWARE | ✅ BOTH: aware of tenant context |
| Packages | ✅ COMPLETE | ✅ WORKS | ✅ WORKS | ✅ Portal: add slug to URL |
| Payments | ✅ COMPLETE | ✅ WORKS | ⚠️ BROKEN | ✅ Portal: add slug to endpoints |
| Sessions | ✅ COMPLETE | ✅ WORKS | ⚠️ BROKEN | ✅ Portal: add slug to endpoints |
| Dashboard | ✅ COMPLETE | ✅ WORKS | ❌ N/A | ✅ No changes needed |
| Reports | ✅ COMPLETE | ✅ WORKS | ❌ N/A | ✅ No changes needed |
| Company profile | ⚠️ PARTIAL | ❌ NOT IMPL | ❌ NOT IMPL | ✅ Admin: load + display |
| Company colors | ✅ BACKEND | ❌ NOT IMPL | ❌ NOT IMPL | ✅ BOTH: apply CSS variables |
| Logo upload | ⚠️ BACKEND | ❌ NOT IMPL | ❌ NOT IMPL | ✅ Admin: form + upload |
| Images (logos/banners) | ⚠️ BACKEND | ❌ NOT IMPL | ❌ NOT IMPL | ✅ Admin: upload service |
| Dynamic branding | ⚠️ BACKEND | ❌ NOT IMPL | ❌ NOT IMPL | ✅ BOTH: load + apply |
| Superadmin admin management | ✅ BACKEND ROUTES | ❌ NO UI | ❌ N/A | ✅ Part 7: new UI |
| Superadmin company management | ✅ COMPLETE | ❌ NOT IMPL | ❌ N/A | ✅ Part 7: new UI |
| Platform company dashboard | ✅ COMPLETE | ❌ NOT IMPL | ❌ N/A | ✅ Part 7: new UI |
| Customer tenant resolution | ✅ BACKEND | ❌ NOT IMPL | ❌ NOT IMPL | ✅ Portal: slug resolution |
| Customer dynamic branding | ✅ BACKEND | ❌ N/A | ❌ NOT IMPL | ✅ Portal: load + apply |
| MikroTik integration | ⚠️ NOT IMPL | ❌ NOT IMPL | ❌ NOT IMPL | ❌ Backend future work |
| Admin app route guards | ✅ BASIC | ✅ AUTH ONLY | ❌ N/A | ✅ Add role guards (Part 7) |
| Customer app routes | ✅ READY | ❌ N/A | ✅ WORKS | ✅ Add slug parameter |

### Legend
- ✅ COMPLETE — Fully implemented, production-ready
- ⚠️ PARTIAL — Partially implemented, needs completion
- ❌ NOT IMPLEMENTED — Does not exist
- ⚠️ BROKEN — Exists but incorrect/non-functional
- N/A — Not applicable to this component

---

# SECTION 26 — CRITICAL PROBLEMS BEFORE PART 6

### Priority 1: Frontend/Backend Route Mismatches

**CRITICAL**: Customer portal calls WRONG endpoints
```
Frontend calls: GET /api/public/packages (DOES NOT EXIST)
Backend has:   GET /api/public/companies/:slug/packages

Impact: ❌ PORTAL BROKEN (cannot load packages without slug)

Fix: Update customer portal routes to include company slug resolution
Timeline: MUST FIX before Part 6B can proceed
```

### Priority 2: Admin Model Missing Fields

**ISSUE**: Frontend Admin model missing fields from backend response
```
Backend returns: { id, company_id, name, email, role, status, is_active }
Frontend expects: { id, name, email, is_active, status }

Missing:
- company_id (needed for Part 6A)
- role (needed for role-based UI)

Fix: Update admin.model.ts to include both fields
Timeline: MUST FIX before Part 6A can proceed
```

### Priority 3: Company Service Incomplete

**ISSUE**: company.service.ts drafted but not integrated
```
Status: Partially written, never called anywhere
Methods exist but not invoked by AdminLayout
Branding CSS variables defined but never applied

Fix: Complete company.service.ts and wire into AdminLayoutComponent
Timeline: MUST FIX before Part 6A can proceed
```

### Priority 4: Hardcoded Company Names

**ISSUE**: All branding hardcoded to "NetControl" or "Y4C WiFi"
```
Locations:
- admin-layout.component.html (2 places)
- login.page.html (3 places)
- app.html (customer portal 1 place)
- app.routes.ts (customer portal page titles 7 places)
- Various page headers

Fix: Make all branding dynamic via signals/company object
Timeline: Phase 2 of Part 6A
```

### Priority 5: Authentication Response Mismatch

**ISSUE**: Frontend doesn't capture company_id or role from login
```
Backend returns both, frontend ignores
Causes: Cannot implement company-awareness later
Cannot determine admin type (admin vs superadmin)

Fix: Update LoginPage and AuthService to store company_id and role
Timeline: MUST FIX before Part 6A
```

### Priority 6: No Tenant Resolution in Customer Portal

**ISSUE**: Portal has no way to know which company it's serving
```
No slug parameter
No route parameter
No query parameter
No company context at all

Backend routes REQUIRE slug
Frontend passes nothing

Fix: Add tenant resolution mechanism (slug in URL/query)
Timeline: MUST FIX before Part 6B
```

### Priority 7: Customer Portal API Version Mismatch

**ISSUE**: Frontend calls deprecated global endpoints
```
Frontend:
  GET /api/public/packages
  POST /api/public/payments/initiate
  GET /api/public/payments/:ref/status
  GET /api/public/sessions/:id

Backend:
  GET /api/public/companies/:slug/packages
  POST /api/public/companies/:slug/payments/initiate
  GET /api/public/companies/:slug/payments/:ref/status
  GET /api/public/companies/:slug/sessions/:id

Status: ❌ ALL CUSTOMER PORTAL CALLS BROKEN

Fix: Update ALL customer portal service endpoints to include slug
Timeline: CRITICAL BLOCKER for Part 6B
```

### Priority 8: Missing Super Admin Detection in Frontend

**ISSUE**: Frontend ignores role field, treats all as "admin"
```
Cannot show/hide Super Admin UI
Cannot guard Super Admin routes
Cannot display different dashboards

Fix: Add role checking in auth flow + guards
Timeline: Phase 2 of Part 6A, enables Part 7
```

---

# SECTION 27 — HANDOFF RULES

## You MUST provide:
- ✅ Exact file paths (complete, no "find something like")
- ✅ Exact component names (will appear in IDE autocomplete)
- ✅ Exact service method names (will be called directly)
- ✅ Exact endpoint URLs (will be called by HTTP client)
- ✅ Exact model field names (will be accessed in templates)
- ✅ Current behavior (what Version 1 does NOW)
- ✅ Current limitations (what Version 1 CANNOT do)
- ✅ Backend contracts (exact response shapes)
- ✅ File modifications checklist (exact files to change)

## You MUST NOT:
- ❌ Say "there's probably a file like..."
- ❌ Guess at endpoint names
- ❌ Assume multi-tenant code exists when it doesn't
- ❌ Mix current behavior with target architecture
- ❌ Leave ambiguous component paths
- ❌ Forget to mention hardcoded assumptions
- ❌ Omit critical missing pieces

## Key Separation:
**CURRENT VERSION 1** — What exists and works NOW
**TARGET MULTI-TENANT** — What WILL exist after refactor

This handoff documents ONLY what currently exists.

---

# SECTION 28 — PASTE THIS INTO CHATGPT

## SYSTEM PROMPT FOR NEXT AI DEVELOPER

I am a System AI continuing work on the Network-Monitoring-System. The previous AI engineer completed a deep technical analysis of Version 1 frontends before multi-tenant refactoring. I have the complete analysis document (TECHNICAL-HANDOFF.md) but need you to execute the refactoring in phases.

**Current State Summary**:
- **Admin-App** (Angular 20.3.25 + Ionic 8): Single-company ISP admin dashboard. NO Super Admin UI. Uses hardcoded "NetControl" branding. Does NOT load company profile or apply dynamic colors.
- **Customer-Portal** (Angular 22.1.0): Single-company package checkout portal. Hardcoded "Y4C WiFi". Has NO tenant resolution — BROKEN because backend routes now require company slug in URL.
- **Backend** (Express.js): ALREADY refactored for multi-tenancy. Filters data by company_id from JWT. Public routes REQUIRE company slug parameter. Superadmin routes exist but no frontend.

**Critical Blockers Identified**:
1. Admin model missing `company_id` and `role` fields
2. Company service drafted but never integrated
3. Customer portal calls WRONG endpoints (no slug)
4. All branding hardcoded
5. No tenant resolution in customer portal
6. No role-based UI

**Part 6A Goal**: Convert admin-app to company-aware
- Load company profile + branding on admin login
- Display company name dynamically
- Apply company colors via CSS variables
- Add company profile/settings pages
- Keep existing dashboard/packages/payments/sessions/reports unchanged

**Part 6B Goal**: Fix customer-portal tenant resolution
- Add company slug to all routes/queries
- Load company profile from endpoint
- Apply company branding
- Fix all broken API calls (add :companySlug parameter)

**Part 7 Goal**: Build new Super Admin UI (FUTURE — not in this phase)

**Critical Exactness Required**:
- Exact file paths (no "find something like")
- Exact endpoint URLs (will be called directly)
- Exact model field names
- Exact service method signatures
- Current vs. target behavior clearly separated

---

# END OF HANDOFF

**Document Complete**: All 28 sections covered  
**Scope**: Version 1 Analysis Only (No Implementation)  
**Accuracy**: Based on actual code inspection (NOT assumptions)  
**Ready For**: Part 6A/6B implementation by next developer

