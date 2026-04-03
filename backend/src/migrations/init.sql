-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add columns if they don't exist yet (safe to run on existing DBs)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS admin_password_hash VARCHAR(500);
ALTER TABLE settings ADD COLUMN IF NOT EXISTS account_reference VARCHAR(100);

-- Settings table: stores Daraja API credentials (one row per business/tenant)
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  business_name VARCHAR(255) DEFAULT 'My Business',
  consumer_key VARCHAR(500),
  consumer_secret VARCHAR(500),
  shortcode VARCHAR(20),
  passkey TEXT,
  transaction_type VARCHAR(50) DEFAULT 'CustomerPayBillOnline',
  callback_url VARCHAR(500),
  environment VARCHAR(15) DEFAULT 'sandbox',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert a default empty settings row if none exists
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone VARCHAR(15) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reference VARCHAR(100),
  description VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  mpesa_receipt VARCHAR(50),
  checkout_request_id VARCHAR(150),
  merchant_request_id VARCHAR(150),
  result_code INTEGER,
  result_desc VARCHAR(500),
  cashier_note VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by checkout_request_id (used in callback)
CREATE INDEX IF NOT EXISTS idx_transactions_checkout_request_id
  ON transactions (checkout_request_id);

-- Index for status polling
CREATE INDEX IF NOT EXISTS idx_transactions_status
  ON transactions (status);

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_transactions_created_at
  ON transactions (created_at DESC);
