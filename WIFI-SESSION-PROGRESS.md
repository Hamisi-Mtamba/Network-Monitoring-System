# Wi-Fi/session implementation checkpoint — 7 September 2026

The full request is **not complete**. Issue 1 is implemented and automatically tested. The reconnect implementation is ready for physical verification. Work pauses at implementation-order step 5 (test reconnect), following the supplied requirement to obtain physical-device results before continuing.

## Repository findings

- Customer routes: `customer-portal/src/app/app.routes.ts`; company branding and identity: `services/tenant.service.ts`.
- The existing edited `payment.ts` stored Wi-Fi context locally. Cash payment used query parameters only. Context now belongs to `WifiContextService`, and route guards capture it at tenant entry.
- Public payment initiation/reference generation: `backend/src/controllers/public/payment.controller.js`.
- Cash/mobile confirmation and session creation: `backend/src/controllers/admin/payment.controller.js`. Confirmation inserts an active session with `CURRENT_TIMESTAMP + duration_minutes`, provisions the router, then commits.
- Session routes/controllers exist under `backend/src/routes/{public,admin}` and `backend/src/controllers/{public,admin}`. Admin status updates currently change only database status.
- `backend/services/mikrotik.service.js` already listed hosts/users/active connections and internally removed MAC users and active connections. Provisioning creates a MAC user then removes its stale host. That flow remains; reconnect adds second-level remaining duration and REST timeouts.
- REST uses the fixed local target `192.168.88.1:443`, server `hotspot1`, and user profile `default`. `hsprof1` is the HotSpot server profile, a different setting. Credentials remain server-side. Local certificate behavior was preserved.
- No existing SQL schema/migration files were found. Read-only inspection of the live database confirmed the requested context columns. There are no remaining-duration or device-metadata columns yet.
- PostgreSQL timezone is `Africa/Nairobi`; existing start/expiry columns are `timestamp without time zone`. Reconnect calculates remaining seconds in PostgreSQL using that timezone.
- Current references use `MOBILEPAYMENT-<milliseconds>-<random>` and `CASHPAYMENT-<milliseconds>-<random>`. Required readable references are still pending.

## Implemented behavior

- Central Wi-Fi persistence across navigation and reloads. Mobile/cash payments use this service.
- Fresh captive query values replace the stored record. Incomplete new context invalidates the old record rather than mixing devices. Tenant changes clear the old context.
- MAC, IPv4 address, required fields and HTTP(S) login URL validation before context can be used. No payment credentials stored.
- `POST /api/public/companies/:companySlug/sessions/reconnect` resolves an active router within an active company and selects the existing active purchase for its MAC/router.
- Existing sessions are locked during restoration. No new payment/session is inserted and `expires_at` is never extended.
- MikroTik's host table must confirm the MAC/IP pair before restoration. Correctly timed active MAC connections are retained; otherwise access is recreated using remaining seconds and the stale host is cleared.
- Packages, mobile payment and cash payment routes check for existing access. Paid devices go to the existing session page; suspended devices and failed connection checks get a retry/contact-provider screen.
- Expired matching rows are updated during this reconnect lookup only. Scheduled/global expiry synchronization is still pending.

## Files changed

Customer portal:

- `src/app/services/wifi-context.service.ts` and `.spec.ts` (new)
- `src/app/services/reconnect.guard.ts` and `.spec.ts` (new)
- `src/app/app.routes.ts`
- `src/app/pages/payment/payment.ts` (retains the pre-existing edited payment behavior while extracting storage)
- `src/app/pages/cash-payment/cash-payment.ts`
- `src/app/pages/packages/packages.spec.ts`
- `src/app/app.spec.ts`

Backend:

- `services/session-reconnect.service.js` (new)
- `src/controllers/public/reconnect.controller.js` (new)
- `services/mikrotik.service.js`
- `src/routes/public/session.route.js`
- `test/session-reconnect.test.js` and `test/mikrotik-restore.test.js` (new)
- `package.json` (replaces the placeholder test script with Node tests)

Report: `WIFI-SESSION-PROGRESS.md`.

## Validation results

| Check | Result |
|---|---|
| Customer production build | PASS; four existing component CSS budget warnings |
| Customer regression tests | PASS: 14 tests in four files |
| Customer TypeScript application compile | PASS |
| Backend `npm.cmd test` | PASS: 11 tests, including mocked REST operations |
| All backend JavaScript syntax checks | PASS |
| Express reconnect route smoke check | PASS: malformed identity returns HTTP 400 |
| Reconnect queries against real PostgreSQL schema | PASS: synthetic MAC, transaction rolled back, no router calls |
| Real MikroTik read-only REST check | PASS: two hosts, zero active sessions at inspection time |
| Physical payment/reconnect/MAC authentication | PENDING: requires customer device |
| Admin build/tests | NOT RUN: admin work has not started; implementation-order checkpoint reached first |

Initial Angular commands failed because installed Node is 24.14.1. Tests/builds succeeded using a temporary Node 24.15.0 runtime without changing the system installation. PowerShell blocks `npm.ps1`; use `npm.cmd`.

Two obsolete starter tests initially failed (generated welcome title and missing route provider); they were repaired to exercise the actual portal shell and customer navigation. No automated test failures remain.

Run customer checks from `customer-portal`:

```powershell
npm.cmd exec --yes --package=node@24.15.0 -- node node_modules/@angular/cli/bin/ng.js build
npm.cmd exec --yes --package=node@24.15.0 -- node node_modules/@angular/cli/bin/ng.js test --watch=false
```

Run backend checks from `backend`:

```powershell
npm.cmd test
```

## Required physical test now

Use one device and keep its per-network MAC address stable throughout the test. Substitute its actual MAC wherever `XX:XX:XX:XX:XX:XX` appears. Do not run the existing `backend/test-mikrotik.js`: it overwrites access for its hardcoded MAC with five minutes.

1. Ensure the updated backend and customer dev server are running. If restarting, run `npm.cmd run dev` from `backend`. From `customer-portal`, run:

   ```powershell
   npm.cmd exec --yes --package=node@24.15.0 -- node node_modules/@angular/cli/bin/ng.js serve --host 0.0.0.0
   ```

2. Connect your test phone. Open `http://neverssl.com` if no captive popup appears. Confirm arrival at `http://192.168.88.254:4200/abc-company/packages` with `mac`, `ip`, `router`, and `loginUrl`. Use the MAC shown there.
3. Navigate to payment, cash payment, company information, and back. Refresh the payment page. Submit only one payment request for the shortest suitable existing test package and confirm it through the existing admin flow.
4. Run these read-only commands on MikroTik and retain the output:

   ```routeros
   /ip hotspot active print detail where mac-address="XX:XX:XX:XX:XX:XX"
   /ip hotspot user print detail where name="XX:XX:XX:XX:XX:XX"
   /ip hotspot host print detail where mac-address="XX:XX:XX:XX:XX:XX"
   ```

   Expect MAC authentication (`login-by="mac"`) and the purchased duration. Confirm internet works.

5. Record the database purchase/session identity and absolute expiry using this read-only SQL (replace the MAC):

   ```sql
   SELECT s.id, s.payment_id, s.status, s.started_at, s.expires_at,
          FLOOR(EXTRACT(EPOCH FROM (s.expires_at - CURRENT_TIMESTAMP::timestamp))) AS remaining_seconds
   FROM internet_sessions s
   JOIN companies c ON c.id = s.company_id
   JOIN mikrotik_routers r ON r.id = s.router_id AND r.company_id = s.company_id
   WHERE c.slug = 'abc-company'
     AND r.public_id = 'NMS-LOCAL-ROUTER-001'
     AND UPPER(s.device_mac) = 'XX:XX:XX:XX:XX:XX'
   ORDER BY s.id DESC;
   ```

6. Turn phone Wi-Fi off for two minutes, then reconnect. Check whether internet returns automatically. Do not purchase another package. Open the saved captive URL manually to exercise the backend reconnect check if the router already authenticates the device without opening the portal.
7. Expect the existing session screen. Repeat the three RouterOS commands and SQL query. The session ID, payment ID, row count and `expires_at` must remain unchanged. Remaining time should have decreased by elapsed wall time, including the two disconnected minutes.
8. Open the packages URL again. It should return to the existing session without creating another purchase. Report any retry screen or API error.

Return: MAC used, before/after RouterOS output, before/after SQL results, whether internet restored without opening the portal, and what happened when opening the saved captive URL. No passwords or router credentials are needed.

## Remaining work and limitations

- Physical reconnect behavior is unverified. Automatic MAC reauthentication can bypass Angular entirely; this checkpoint does not claim that absolute expiry is enforced on that path yet.
- Implement the scheduled expiry reconciliation next. RouterOS `limit-uptime` measures uptime, so it alone cannot enforce an absolute wall-clock expiry across disconnects. See [MikroTik HotSpot documentation](https://help.mikrotik.com/docs/spaces/ROS/pages/56459266/HotSpot%2B-%2BCaptive%2Bportal).
- Implement suspend/revoke, frozen remaining duration, safe migration, and reactivate; then test those on the router.
- Implement server-side readable references and uniqueness, browser metadata, admin/Superadmin display, branding review, and full tenant authorization audit.
- Current REST integration has one configured credential pair/router. Reconnect rejects other router mappings; general multi-router credentials/configuration remains to be addressed. The current verified mapping is ABC Networks / `NMS-LOCAL-ROUTER-001`.
- Backend/router operations are not a distributed transaction. A partial router failure can leave access needing a retry; the customer sees a connection-check error rather than being sent to purchase.
- No database migration or schema change has been applied or is required for this checkpoint. Later suspension and metadata work requires inspected, reviewed migrations.

## Open Wi-Fi checks

Read-only commands:

```routeros
/interface wifi print detail
/ip hotspot print detail
/ip hotspot profile print detail where name="hsprof1"
```

Verify both `wifi1` and `wifi2` have effective `security.authentication-types=""`. Verify the intended `login-by=mac,cookie,http-chap` and `mac-auth-mode=mac-as-username` settings. No router configuration was changed automatically.

If Linux requests a Wi-Fi password, forget the saved network and reconnect to remove a cached WPA profile. Distinguish a Wi-Fi password prompt from an OS keyring/admin prompt. Captive popup appearance depends on the operating system; test manual HTTP browsing as well.
