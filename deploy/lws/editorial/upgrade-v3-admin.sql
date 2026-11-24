-- PROPOSITION : comparer au schéma réel avant import ; sauvegarder V3. Aucun DROP, aucune donnée migrée.
-- Ce script complète upgrade-v3.sql et upgrade-programming.sql pour les modules
-- administration raccordés à LWS_EDITORIAL_API_URL : profils/rôles, rubriques,
-- médiathèque, compteurs de lecture et régie du direct.
USE cp1779864p23_tvplus_v3;

CREATE TABLE IF NOT EXISTS tvp_profiles (
 id CHAR(36) NOT NULL PRIMARY KEY,
 email VARCHAR(255) NOT NULL DEFAULT '',
 full_name VARCHAR(120) NULL,
 role VARCHAR(50) NOT NULL DEFAULT 'reader',
 is_active TINYINT(1) NOT NULL DEFAULT 0,
 created_at DATETIME(6) NULL,
 updated_at DATETIME(6) NULL,
 INDEX idx_tvp_profile_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Les clés reprennent les rôles déjà présents dans la base V2 (reader, admin,
-- super_admin, editor...). Les permissions sont la liste pointée utilisée par
-- l'API : articles.read_all, articles.create, articles.review, shows.manage,
-- categories.manage, media.upload, users.manage, schedule.manage, audit.read.
CREATE TABLE IF NOT EXISTS tvp_roles (
 role_key VARCHAR(50) NOT NULL PRIMARY KEY,
 label VARCHAR(120) NOT NULL DEFAULT '',
 permissions JSON NOT NULL,
 INDEX idx_tvp_role_key (role_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tvp_article_read_stats (
 article_id CHAR(36) NOT NULL PRIMARY KEY,
 read_count INT UNSIGNED NOT NULL DEFAULT 0,
 updated_at DATETIME(6) NULL,
 INDEX idx_tvp_read_count (read_count)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tvp_live_settings (
 id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
 title VARCHAR(120) NOT NULL DEFAULT 'TV+ Afrique en direct',
 description TEXT NOT NULL,
 standby_message VARCHAR(350) NOT NULL DEFAULT 'Le direct reprendra prochainement.',
 player_platform VARCHAR(20) NOT NULL DEFAULT 'restream',
 playback_url VARCHAR(1300) NOT NULL DEFAULT '',
 hls_url VARCHAR(1300) NOT NULL DEFAULT '',
 enabled TINYINT(1) NOT NULL DEFAULT 0,
 starts_at DATETIME(6) NULL,
 ends_at DATETIME(6) NULL,
 updated_at DATETIME(6) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tvp_live_settings (id, title, description, standby_message, player_platform, playback_url, hls_url, enabled, updated_at)
SELECT 1, 'TV+ Afrique en direct', '', 'Le direct reprendra prochainement.', 'restream', '', '', 0, UTC_TIMESTAMP(6)
WHERE NOT EXISTS (SELECT 1 FROM tvp_live_settings WHERE id = 1);

CREATE TABLE IF NOT EXISTS tvp_audit_logs (
 id CHAR(36) NOT NULL PRIMARY KEY,
 actor_id CHAR(36) NULL,
 actor_email VARCHAR(255) NOT NULL DEFAULT '',
 action VARCHAR(80) NOT NULL,
 entity VARCHAR(80) NOT NULL DEFAULT '',
 entity_id CHAR(36) NULL,
 details JSON NULL,
 created_at DATETIME(6) NULL,
 INDEX idx_tvp_audit_created (created_at DESC),
 INDEX idx_tvp_audit_entity (entity, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- tvp_media est déjà utilisé par les articles/émissions. On ajoute seulement
-- les champs nécessaires à la médiathèque administrative, sans toucher aux données.
ALTER TABLE tvp_media
  ADD COLUMN IF NOT EXISTS size_bytes INT UNSIGNED NULL,
  ADD COLUMN IF NOT EXISTS uploaded_by CHAR(36) NULL,
  ADD COLUMN IF NOT EXISTS created_at DATETIME(6) NULL;

ALTER TABLE tvp_categories
  ADD COLUMN IF NOT EXISTS hue SMALLINT UNSIGNED NOT NULL DEFAULT 216,
  ADD COLUMN IF NOT EXISTS created_at DATETIME(6) NULL,
  ADD COLUMN IF NOT EXISTS updated_at DATETIME(6) NULL;
