-- Studio audiovisuel v1 : sauvegarder et tester sur une copie de V3.
-- MariaDB 11.4 ; aucun DROP, aucune réécriture des publications existantes.
-- Les états NULL héritent du statut et de la date existants.
ALTER TABLE tvp_editorial_media
 ADD COLUMN IF NOT EXISTS studio_state ENUM('draft','production','review','approved','scheduled','published','archived') NULL,
 ADD COLUMN IF NOT EXISTS studio_meta JSON NULL,
 ADD COLUMN IF NOT EXISTS studio_revision INT UNSIGNED NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS studio_updated_by CHAR(36) NULL,
 ADD INDEX IF NOT EXISTS idx_studio_kind_state (kind,studio_state,updated_at);
-- Vérification uniquement.
SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tvp_editorial_media'
AND COLUMN_NAME IN ('studio_state','studio_meta','studio_revision','studio_updated_by');
