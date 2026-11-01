-- Apply after the existing base schema. No historical payment/SMS rows are deleted.
BEGIN;
CREATE TABLE IF NOT EXISTS company_selcom_settings (
    company_id BIGINT PRIMARY KEY REFERENCES companies(id),
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    vendor VARCHAR(100) NOT NULL,
    buyer_email VARCHAR(254) NOT NULL,
    credentials TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS selcom_orders (
    order_id VARCHAR(32) PRIMARY KEY,
    payment_id BIGINT NOT NULL UNIQUE REFERENCES payments(id),
    company_id BIGINT NOT NULL REFERENCES companies(id),
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    credentials TEXT NOT NULL,
    request JSONB NOT NULL,
    provider_reference VARCHAR(160),
    state VARCHAR(32) NOT NULL DEFAULT 'creating',
    checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, provider_reference)
);
CREATE TABLE IF NOT EXISTS hotspot_jobs (
    session_id BIGINT PRIMARY KEY REFERENCES internet_sessions(id),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    activation_started_at TIMESTAMPTZ,
    attempts INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_error TEXT,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    done BOOLEAN NOT NULL DEFAULT FALSE
);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS verification_source VARCHAR(32),
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS provider_transaction_id VARCHAR(160),
    ADD COLUMN IF NOT EXISTS confirmed_by_admin_id BIGINT,
    ADD COLUMN IF NOT EXISTS purchased_duration_minutes INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS payments_company_provider_transaction_unique
    ON payments(company_id,provider_transaction_id) WHERE provider_transaction_id IS NOT NULL;
-- Extend only payment-method checks; retain existing legacy values for historical rows.
DO $$ DECLARE c RECORD; BEGIN
 FOR c IN SELECT conname, pg_get_expr(conbin, conrelid) AS expr FROM pg_constraint
 WHERE conrelid='payments'::regclass AND contype='c' AND cardinality(conkey)=1
 AND pg_get_expr(conbin, conrelid) LIKE '%payment_method%'
 AND pg_get_expr(conbin, conrelid) NOT LIKE '%selcom%'
 LOOP
 EXECUTE format('ALTER TABLE payments DROP CONSTRAINT %I', c.conname);
 EXECUTE format('ALTER TABLE payments ADD CONSTRAINT %I CHECK ((%s) OR payment_method = ''selcom'')', c.conname, c.expr);
 END LOOP;
END $$;
UPDATE companies SET settings = COALESCE(settings, '{}'::jsonb) - 'payment' - 'payments'
WHERE settings ? 'payment' OR settings ? 'payments';
DO $$ BEGIN
 IF to_regclass('payment_devices') IS NOT NULL THEN UPDATE payment_devices SET is_active=FALSE; END IF;
END $$;
CREATE INDEX IF NOT EXISTS selcom_orders_pending ON selcom_orders(checked_at) WHERE state <> 'completed';
COMMIT;
