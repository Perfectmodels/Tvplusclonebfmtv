-- Rapprochement SingPay : MariaDB 11.4, migration additive après sauvegarde.
ALTER TABLE tvp_live_payments
 ADD COLUMN IF NOT EXISTS last_checked_at DATETIME(6) NULL,
 ADD COLUMN IF NOT EXISTS next_check_at DATETIME(6) NULL,
 ADD COLUMN IF NOT EXISTS check_attempts INT UNSIGNED NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS last_check_result VARCHAR(40) NULL,
 ADD INDEX IF NOT EXISTS idx_payment_reconcile (mode,state,next_check_at);
