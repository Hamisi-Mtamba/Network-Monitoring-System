-- Initial low-cost automatic payment-verification foundation.
-- Run this once against the network_monitoring_system PostgreSQL database.

CREATE TABLE IF NOT EXISTS payment_devices (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    gateway VARCHAR(32) NOT NULL DEFAULT 'httpsms',
    device_name VARCHAR(120),
    gateway_owner VARCHAR(120) NOT NULL,
    phone_number VARCHAR(32),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (gateway, gateway_owner)
);

CREATE TABLE IF NOT EXISTS payment_sms (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    payment_device_id BIGINT NOT NULL REFERENCES payment_devices(id) ON DELETE RESTRICT,
    payment_id BIGINT REFERENCES payments(id) ON DELETE SET NULL,
    gateway VARCHAR(32) NOT NULL,
    gateway_event_id VARCHAR(160) NOT NULL UNIQUE,
    gateway_message_id VARCHAR(160),
    sender VARCHAR(120),
    raw_message TEXT NOT NULL,
    sim VARCHAR(120),
    provider VARCHAR(64),
    provider_transaction_id VARCHAR(160),
    payer_phone VARCHAR(32),
    amount NUMERIC(14,2),
    received_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ,
    processing_status VARCHAR(32) NOT NULL DEFAULT 'received',
    processing_error TEXT,
    raw_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_sms_device_message_unique
    ON payment_sms (payment_device_id, gateway_message_id)
    WHERE gateway_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_sms_company_status_idx
    ON payment_sms (company_id, processing_status, received_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS payment_sms_provider_transaction_unique
    ON payment_sms (company_id, provider, provider_transaction_id)
    WHERE provider_transaction_id IS NOT NULL;

-- These fields let the existing payments table record how an automatic payment
-- was verified without replacing the existing cash/mobile-payment logic.
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS provider_transaction_id VARCHAR(160),
    ADD COLUMN IF NOT EXISTS verification_source VARCHAR(32),
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS matched_payment_sms_id BIGINT REFERENCES payment_sms(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payments_company_provider_transaction_unique
    ON payments (company_id, provider_transaction_id)
    WHERE provider_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS payments_pending_match_idx
    ON payments (company_id, status, created_at DESC, amount)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS payment_sms_review_idx
    ON payment_sms (company_id, processing_status, received_at DESC)
    WHERE processing_status IN ('needs_review','error');
