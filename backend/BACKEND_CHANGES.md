# Backend change inventory

## Updated files

- `.env.example`
- `PAYMENT_SETUP.md`
- `index.js`
- `package-lock.json`
- `package.json`
- `services/mikrotik.service.js`
- `services/session-reconnect.service.js`
- `services/transaction-reference.service.js`
- `src/controllers/admin/companyProfile.controller.js`
- `src/controllers/admin/payment.controller.js`
- `src/controllers/admin/session.controller.js`
- `src/controllers/public/payment.controller.js`
- `src/database/database.js`
- `src/routes/admin/companyProfile.route.js`
- `src/routes/admin/payment.route.js`
- `src/routes/platform/company.routes.js`
- `test/cash-phone-optional.test.js`
- `test/mikrotik-restore.test.js`
- `test/session-reconnect.test.js`
- `test/transaction-reference.test.js`

## Added files

- `BACKEND_CHANGES.md`
- `services/payment-fulfillment.service.js`
- `services/selcom-client.service.js`
- `services/selcom-payment.service.js`
- `services/session-lifecycle.service.js`
- `src/controllers/admin/selcomSettings.controller.js`
- `src/controllers/integrations/selcom.controller.js`
- `src/database/migrations/002_selcom_payments.sql`
- `src/routes/integrations/selcom.routes.js`
- `test/payment-postgres.test.js`
- `test/selcom-client.test.js`

## Removed from the updated archive

- `.env`
- `PAYMENT_STAGE1_SETUP.md`
- `project-controllers.txt`
- `services/payment-sms-parser.service.js`
- `services/payment-verification.service.js`
- `src/controllers/admin/paymentSms.controller.js`
- `src/controllers/integrations/httpsms.controller.js`
- `src/routes/integrations/httpsms.routes.js`
- `test/payment-sms-parser.test.js`
- `test/transaction-reference.postgres.js`

When merging into an existing backend, delete the retired source and test files listed above. Keep your deployment’s own `.env` and apply the additions described in `PAYMENT_SETUP.md`. The uploaded live `.env` is intentionally excluded. Historical migration 001 remains for audit/history, with no active SMS routes or workers.
