-- MariaDB : importer dans cp1779864p23_tvplus_v3 après sauvegarde.
-- Aucune offre imposée, aucun encaissement automatiquement activé.
CREATE TABLE IF NOT EXISTS tvp_premium_settings (
 id TINYINT UNSIGNED PRIMARY KEY,
 checkout_enabled TINYINT(1) NOT NULL DEFAULT 0,
 golive_confirmed TINYINT(1) NOT NULL DEFAULT 0,
 checkout_hosts VARCHAR(1500) NOT NULL DEFAULT '',
 return_origin VARCHAR(300) NOT NULL DEFAULT '',
 updated_at DATETIME(6) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT IGNORE INTO tvp_premium_settings(id,updated_at) VALUES(1,UTC_TIMESTAMP(6));
SELECT id,checkout_enabled,golive_confirmed FROM tvp_premium_settings WHERE id=1;
