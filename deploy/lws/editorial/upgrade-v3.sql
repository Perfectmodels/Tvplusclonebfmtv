USE cp1779864p23_tvplus_v3;
ALTER TABLE tvp_articles
  MODIFY status ENUM('draft','pending','published','archived','rejected','in_review','approved','scheduled','inactive') NOT NULL DEFAULT 'draft',
  MODIFY updated_at DATETIME(6) NULL,
  MODIFY created_at DATETIME(6) NULL,
  MODIFY published_at DATETIME(6) NULL,
  ADD COLUMN IF NOT EXISTS province_slug VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS subcategory_id CHAR(36) NULL,
  ADD COLUMN IF NOT EXISTS reviewed_by CHAR(36) NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at DATETIME(6) NULL;
