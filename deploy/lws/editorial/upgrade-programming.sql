-- PROPOSITION : comparer au schéma réel avant import; sauvegarder V3. Aucun DROP.
CREATE TABLE IF NOT EXISTS tvp_shows (
 id CHAR(36) NOT NULL PRIMARY KEY, slug VARCHAR(100) NOT NULL UNIQUE,
 title VARCHAR(130) NOT NULL, tagline VARCHAR(200) NOT NULL DEFAULT '',
 description TEXT NOT NULL, schedule_label VARCHAR(150) NOT NULL DEFAULT '',
 host_name VARCHAR(130) NOT NULL DEFAULT '', frequency VARCHAR(130) NOT NULL DEFAULT '',
 category_id CHAR(36) NULL, cover_media_id CHAR(36) NULL,is_active TINYINT(1) NOT NULL DEFAULT 0,
 position SMALLINT UNSIGNED NOT NULL DEFAULT 0,created_at DATETIME(6) NOT NULL,updated_at DATETIME(6) NOT NULL,
 INDEX idx_show_public(is_active,position)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS tvp_episodes (
 id CHAR(36) NOT NULL PRIMARY KEY,show_id CHAR(36) NOT NULL,title VARCHAR(200) NOT NULL,description TEXT NOT NULL,
 aired_at DATETIME(6) NOT NULL,duration_seconds INT UNSIGNED NULL,platform VARCHAR(20) NULL,external_id VARCHAR(1300) NULL,
 source_url VARCHAR(1300) NOT NULL DEFAULT '',thumbnail_url VARCHAR(1300) NOT NULL DEFAULT '',
 publish_at DATETIME(6) NULL,status ENUM('draft','published') NOT NULL DEFAULT 'draft',
 created_at DATETIME(6) NOT NULL,updated_at DATETIME(6) NOT NULL,
 INDEX idx_episode_public(status,publish_at,aired_at),INDEX idx_episode_show(show_id,aired_at),
 CONSTRAINT fk_tvp_episode_show FOREIGN KEY(show_id) REFERENCES tvp_shows(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
