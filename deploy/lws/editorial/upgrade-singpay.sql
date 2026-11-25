-- Migration additive. Sauvegarder tvplus_v3 avant exécution. Aucun tarif préactivé.
CREATE TABLE IF NOT EXISTS tvp_live_plans (
 slug VARCHAR(50) PRIMARY KEY,name VARCHAR(100) NOT NULL,amount INT UNSIGNED NOT NULL,duration_minutes INT UNSIGNED NOT NULL,
 active TINYINT(1) NOT NULL DEFAULT 0,updated_at DATETIME(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS tvp_live_entitlements (
 id CHAR(36) PRIMARY KEY,user_id CHAR(36) NOT NULL,starts_at DATETIME(6) NOT NULL,ends_at DATETIME(6) NOT NULL,
 status ENUM('active','revoked') NOT NULL DEFAULT 'active',reference VARCHAR(200) UNIQUE,INDEX(user_id,status,ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS tvp_live_payments (
 reference CHAR(36) PRIMARY KEY,user_id CHAR(36) NOT NULL,plan_slug VARCHAR(50) NOT NULL,plan_name VARCHAR(100) NOT NULL,
 amount INT UNSIGNED NOT NULL,duration_minutes INT UNSIGNED NOT NULL,wallet_id VARCHAR(200) NOT NULL,mode ENUM('sandbox','production') NOT NULL,
 state ENUM('reserved','pending','paid','failed','review') NOT NULL DEFAULT 'reserved',
 provider_id VARCHAR(200) NULL UNIQUE,checkout_url VARCHAR(2500) NULL,checkout_expires_at DATETIME(6) NULL,
 entitlement_ends_at DATETIME(6) NULL,created_at DATETIME(6) NOT NULL,updated_at DATETIME(6) NOT NULL,
 INDEX(user_id,state),INDEX(created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
