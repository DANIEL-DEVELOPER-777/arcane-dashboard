-- MT5 Dashboard Database Setup
-- Run this SQL on your mt5_db database to create all required tables

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  balance DOUBLE PRECISION NOT NULL DEFAULT 0,
  equity DOUBLE PRECISION NOT NULL DEFAULT 0,
  profit DOUBLE PRECISION NOT NULL DEFAULT 0,
  profit_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
  daily_profit DOUBLE PRECISION NOT NULL DEFAULT 0,
  daily_profit_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Create equity_snapshots table
CREATE TABLE IF NOT EXISTS equity_snapshots (
  id SERIAL PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  equity DOUBLE PRECISION NOT NULL,
  balance DOUBLE PRECISION NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for faster queries on equity_snapshots
CREATE INDEX IF NOT EXISTS idx_equity_snapshots_account_id ON equity_snapshots(account_id);
CREATE INDEX IF NOT EXISTS idx_equity_snapshots_timestamp ON equity_snapshots(timestamp);
