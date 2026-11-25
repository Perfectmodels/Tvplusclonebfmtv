-- TV+ Afrique V2 — schema snapshot read-only from Supabase public (2026-11-22)
-- CAUTION: THIS IS A STRUCTURAL REFERENCE, NOT A READY-TO-RUN MIGRATION.
-- The app relies on Supabase Auth, Storage, Vault and functions (auth.uid).
-- Generated from pg_catalog; excludes row data, user identities, encrypted secrets and functions.
-- Use a controlled pg_dump and redesign authentication before restoration on external PostgreSQL.

CREATE TYPE public."app_role" AS ENUM ('super_admin', 'admin', 'editor_in_chief', 'journalist', 'video_editor', 'community_manager');
CREATE TYPE public."article_status" AS ENUM ('draft', 'in_review', 'approved', 'scheduled', 'published', 'inactive', 'archived');
CREATE TYPE public."contribution_kind" AS ENUM ('contribution', 'question', 'contact');
CREATE TYPE public."contribution_status" AS ENUM ('pending', 'verified', 'rejected', 'archived');
CREATE TYPE public."poll_status" AS ENUM ('draft', 'open', 'closed');
CREATE TYPE public."publication_status" AS ENUM ('draft', 'published');
CREATE TYPE public."video_platform" AS ENUM ('youtube', 'tiktok', 'facebook', 'vimeo', 'dailymotion');

CREATE TABLE public."ai_generations" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid DEFAULT auth.uid() NOT NULL,
  "article_id" uuid,
  "kind" text NOT NULL,
  "model" text NOT NULL,
  "input_hash" text NOT NULL,
  "input" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "output" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "input_tokens" integer DEFAULT 0 NOT NULL,
  "output_tokens" integer DEFAULT 0 NOT NULL,
  "cost_usd" numeric(10,6) DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."articles" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "excerpt" text DEFAULT ''::text NOT NULL,
  "category_id" uuid NOT NULL,
  "subcategory_id" uuid,
  "province_slug" text,
  "author_id" uuid DEFAULT auth.uid() NOT NULL,
  "cover_media_id" uuid,
  "content_json" jsonb DEFAULT '{"type": "doc", "content": []}'::jsonb NOT NULL,
  "content_html" text DEFAULT ''::text NOT NULL,
  "tags" text[] DEFAULT '{}'::text[] NOT NULL,
  "seo_title" text,
  "seo_description" text,
  "status" article_status DEFAULT 'draft'::article_status NOT NULL,
  "featured" boolean DEFAULT false NOT NULL,
  "published_at" timestamp with time zone,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "search" tsvector DEFAULT (setweight(to_tsvector('french'::regconfig, COALESCE(title, ''::text)), 'A'::"char") || setweight(to_tsvector('french'::regconfig, COALESCE(excerpt, ''::text)), 'B'::"char")),
  "country_code" text DEFAULT 'GA'::text NOT NULL,
  "is_alert" boolean DEFAULT false NOT NULL,
  "is_video_article" boolean DEFAULT false NOT NULL,
  "video_url" text,
  "short_code" text DEFAULT translate(encode(gen_random_bytes(6), 'base64'::text), '+/'::text, '-_'::text) NOT NULL
);

CREATE TABLE public."audit_logs" (
  "id" bigint NOT NULL,
  "actor_id" uuid,
  "action" text NOT NULL,
  "entity" text NOT NULL,
  "entity_id" text,
  "details" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."categories" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "hue" smallint DEFAULT 216 NOT NULL,
  "parent_id" uuid,
  "position" smallint DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."contributions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "kind" contribution_kind NOT NULL,
  "name" text NOT NULL,
  "contact" text,
  "subject" text,
  "message" text NOT NULL,
  "province_slug" text,
  "locality" text,
  "show_id" uuid,
  "status" contribution_status DEFAULT 'pending'::contribution_status NOT NULL,
  "moderated_by" uuid,
  "moderated_at" timestamp with time zone,
  "moderation_note" text,
  "sender_hash" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."editorial_watch_runs" (
  "id" bigint NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "finished_at" timestamp with time zone,
  "candidates_seen" integer DEFAULT 0 NOT NULL,
  "new_topics" integer DEFAULT 0 NOT NULL,
  "drafts_created" integer DEFAULT 0 NOT NULL,
  "alert_candidates" integer DEFAULT 0 NOT NULL,
  "error" text
);

CREATE TABLE public."editorial_watch_topics" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "headline" text NOT NULL,
  "category_id" uuid,
  "importance" text DEFAULT 'normal'::text NOT NULL,
  "status" text DEFAULT 'review'::text NOT NULL,
  "summary" text DEFAULT ''::text NOT NULL,
  "editorial_angle" text DEFAULT ''::text NOT NULL,
  "to_confirm" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "source_item_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  "draft_article_id" uuid,
  "first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "verified_at" timestamp with time zone,
  "reviewed_by" uuid
);

CREATE TABLE public."episodes" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "show_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "aired_at" timestamp with time zone NOT NULL,
  "duration_seconds" integer,
  "platform" video_platform,
  "external_id" text,
  "status" publication_status DEFAULT 'draft'::publication_status NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "source_url" text DEFAULT ''::text NOT NULL,
  "publish_at" timestamp with time zone,
  "thumbnail_url" text DEFAULT ''::text NOT NULL
);

CREATE TABLE public."homepage_ad_slots" (
  "banner" smallint NOT NULL,
  "slot" smallint NOT NULL,
  "advertiser" text DEFAULT ''::text NOT NULL,
  "image_url" text DEFAULT ''::text NOT NULL,
  "target_url" text DEFAULT ''::text NOT NULL,
  "alt" text DEFAULT ''::text NOT NULL,
  "active" boolean DEFAULT false NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone
);

CREATE TABLE public."legacy_article_import_queue" (
  "legacy_id" integer NOT NULL,
  "state" text DEFAULT 'pending'::text NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_attempt_at" timestamp with time zone,
  "last_error" text,
  "original_published_at" timestamp with time zone,
  "imported_at" timestamp with time zone,
  "article_id" uuid,
  "imgbb_url" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."live_distribution_channels" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "platform" text NOT NULL,
  "watch_url" text DEFAULT ''::text NOT NULL,
  "enabled" boolean DEFAULT false NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."live_stream_targets" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "provider" text DEFAULT 'custom'::text NOT NULL,
  "direction" text DEFAULT 'source'::text NOT NULL,
  "protocol" text DEFAULT 'rtmps'::text NOT NULL,
  "endpoint_secret_id" uuid,
  "stream_key_secret_id" uuid,
  "watch_url" text DEFAULT ''::text NOT NULL,
  "enabled" boolean DEFAULT false NOT NULL,
  "position" integer DEFAULT 0 NOT NULL,
  "notes" text DEFAULT ''::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."live_streams" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "platform" video_platform DEFAULT 'youtube'::video_platform NOT NULL,
  "external_id" text NOT NULL,
  "is_active" boolean DEFAULT false NOT NULL,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."media" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "bucket" text DEFAULT 'media'::text NOT NULL,
  "path" text NOT NULL,
  "mime_type" text NOT NULL,
  "size_bytes" integer NOT NULL,
  "width" integer,
  "height" integer,
  "alt" text DEFAULT ''::text NOT NULL,
  "caption" text DEFAULT ''::text NOT NULL,
  "credit" text DEFAULT ''::text NOT NULL,
  "uploaded_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "imgbb_url" text
);

CREATE TABLE public."news24_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "source_id" uuid NOT NULL,
  "guid_hash" text NOT NULL,
  "title" text NOT NULL,
  "summary" text DEFAULT ''::text NOT NULL,
  "original_url" text NOT NULL,
  "source_name" text NOT NULL,
  "category_id" uuid,
  "status" text DEFAULT 'published'::text NOT NULL,
  "published_at" timestamp with time zone DEFAULT now() NOT NULL,
  "imported_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."poll_votes" (
  "id" bigint NOT NULL,
  "poll_id" uuid NOT NULL,
  "option_id" text NOT NULL,
  "voter_hash" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."polls" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "question" text NOT NULL,
  "options" jsonb NOT NULL,
  "status" poll_status DEFAULT 'draft'::poll_status NOT NULL,
  "opens_at" timestamp with time zone,
  "closes_at" timestamp with time zone,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."profiles" (
  "id" uuid NOT NULL,
  "full_name" text DEFAULT ''::text NOT NULL,
  "role" app_role DEFAULT 'journalist'::app_role NOT NULL,
  "is_active" boolean DEFAULT false NOT NULL,
  "avatar_url" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."program_slots" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "weekday" smallint,
  "start_time" time without time zone NOT NULL,
  "title" text NOT NULL,
  "kind" text DEFAULT ''::text NOT NULL,
  "show_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."provinces" (
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "capital" text NOT NULL,
  "position" smallint DEFAULT 0 NOT NULL
);

CREATE TABLE public."roles" (
  "key" app_role NOT NULL,
  "label" text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "permissions" text[] DEFAULT '{}'::text[] NOT NULL,
  "position" smallint DEFAULT 0 NOT NULL
);

CREATE TABLE public."rss_sources" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "feed_url" text NOT NULL,
  "category_id" uuid,
  "enabled" boolean DEFAULT true NOT NULL,
  "auto_publish" boolean DEFAULT true NOT NULL,
  "last_fetched_at" timestamp with time zone,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."shows" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "title" text NOT NULL,
  "tagline" text DEFAULT ''::text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "category_id" uuid,
  "schedule_label" text DEFAULT ''::text NOT NULL,
  "cover_media_id" uuid,
  "is_active" boolean DEFAULT true NOT NULL,
  "position" smallint DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "host_name" text DEFAULT ''::text NOT NULL,
  "frequency" text DEFAULT ''::text NOT NULL
);

CREATE TABLE public."site_live_settings" (
  "id" smallint DEFAULT 1 NOT NULL,
  "title" text DEFAULT 'TV+ Afrique en direct'::text NOT NULL,
  "hls_url" text DEFAULT ''::text NOT NULL,
  "enabled" boolean DEFAULT false NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "player_platform" text DEFAULT 'hls'::text NOT NULL,
  "playback_url" text DEFAULT ''::text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "starts_at" timestamp with time zone,
  "ends_at" timestamp with time zone,
  "standby_message" text DEFAULT 'Le direct reprendra prochainement.'::text NOT NULL
);

CREATE TABLE public."videos" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "title" text NOT NULL,
  "description" text DEFAULT ''::text NOT NULL,
  "category_id" uuid,
  "platform" video_platform NOT NULL,
  "external_id" text NOT NULL,
  "duration_seconds" integer,
  "featured" boolean DEFAULT false NOT NULL,
  "article_id" uuid,
  "status" publication_status DEFAULT 'draft'::publication_status NOT NULL,
  "published_at" timestamp with time zone,
  "created_by" uuid DEFAULT auth.uid(),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public."ai_generations" ADD CONSTRAINT "ai_generations_cost_usd_check" CHECK (cost_usd >= 0::numeric);
ALTER TABLE public."ai_generations" ADD CONSTRAINT "ai_generations_input_tokens_check" CHECK (input_tokens >= 0);
ALTER TABLE public."ai_generations" ADD CONSTRAINT "ai_generations_output_tokens_check" CHECK (output_tokens >= 0);
ALTER TABLE public."ai_generations" ADD CONSTRAINT "ai_generations_pkey" PRIMARY KEY (id);
ALTER TABLE public."articles" ADD CONSTRAINT "articles_country_code_format_check" CHECK (country_code ~ '^[A-Z]{2}$'::text);
ALTER TABLE public."articles" ADD CONSTRAINT "articles_excerpt_check" CHECK (char_length(excerpt) <= 400);
ALTER TABLE public."articles" ADD CONSTRAINT "articles_pkey" PRIMARY KEY (id);
ALTER TABLE public."articles" ADD CONSTRAINT "articles_publication_date" CHECK ((status <> ALL (ARRAY['scheduled'::article_status, 'published'::article_status])) OR published_at IS NOT NULL);
ALTER TABLE public."articles" ADD CONSTRAINT "articles_seo_description_check" CHECK (char_length(seo_description) <= 400);
ALTER TABLE public."articles" ADD CONSTRAINT "articles_seo_title_check" CHECK (char_length(seo_title) <= 200);
ALTER TABLE public."articles" ADD CONSTRAINT "articles_short_code_format" CHECK (short_code ~ '^[A-Za-z0-9_-]{8}$'::text);
ALTER TABLE public."articles" ADD CONSTRAINT "articles_slug_check" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text AND char_length(slug) <= 140);
ALTER TABLE public."articles" ADD CONSTRAINT "articles_slug_key" UNIQUE (slug);
ALTER TABLE public."articles" ADD CONSTRAINT "articles_title_check" CHECK (char_length(title) >= 1 AND char_length(title) <= 200);
ALTER TABLE public."articles" ADD CONSTRAINT "articles_video_url_format_check" CHECK (video_url IS NULL OR char_length(video_url) <= 2000 AND video_url ~ '^https://'::text);
ALTER TABLE public."audit_logs" ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY (id);
ALTER TABLE public."categories" ADD CONSTRAINT "categories_check" CHECK (parent_id IS DISTINCT FROM id);
ALTER TABLE public."categories" ADD CONSTRAINT "categories_hue_check" CHECK (hue >= 0 AND hue <= 360);
ALTER TABLE public."categories" ADD CONSTRAINT "categories_name_check" CHECK (char_length(name) >= 1 AND char_length(name) <= 80);
ALTER TABLE public."categories" ADD CONSTRAINT "categories_pkey" PRIMARY KEY (id);
ALTER TABLE public."categories" ADD CONSTRAINT "categories_slug_check" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text);
ALTER TABLE public."categories" ADD CONSTRAINT "categories_slug_key" UNIQUE (slug);
ALTER TABLE public."contributions" ADD CONSTRAINT "contributions_contact_check" CHECK (char_length(contact) <= 160);
ALTER TABLE public."contributions" ADD CONSTRAINT "contributions_locality_check" CHECK (char_length(locality) <= 80);
ALTER TABLE public."contributions" ADD CONSTRAINT "contributions_message_check" CHECK (char_length(message) >= 10 AND char_length(message) <= 2000);
ALTER TABLE public."contributions" ADD CONSTRAINT "contributions_name_check" CHECK (char_length(name) >= 2 AND char_length(name) <= 80);
ALTER TABLE public."contributions" ADD CONSTRAINT "contributions_pkey" PRIMARY KEY (id);
ALTER TABLE public."contributions" ADD CONSTRAINT "contributions_subject_check" CHECK (char_length(subject) <= 160);
ALTER TABLE public."editorial_watch_runs" ADD CONSTRAINT "editorial_watch_runs_pkey" PRIMARY KEY (id);
ALTER TABLE public."editorial_watch_topics" ADD CONSTRAINT "editorial_watch_topics_draft_article_id_key" UNIQUE (draft_article_id);
ALTER TABLE public."editorial_watch_topics" ADD CONSTRAINT "editorial_watch_topics_headline_check" CHECK (char_length(headline) >= 5 AND char_length(headline) <= 300);
ALTER TABLE public."editorial_watch_topics" ADD CONSTRAINT "editorial_watch_topics_importance_check" CHECK (importance = ANY (ARRAY['normal'::text, 'major'::text]));
ALTER TABLE public."editorial_watch_topics" ADD CONSTRAINT "editorial_watch_topics_pkey" PRIMARY KEY (id);
ALTER TABLE public."editorial_watch_topics" ADD CONSTRAINT "editorial_watch_topics_status_check" CHECK (status = ANY (ARRAY['review'::text, 'alert_candidate'::text, 'verified'::text, 'dismissed'::text]));
ALTER TABLE public."episodes" ADD CONSTRAINT "episodes_check" CHECK ((platform IS NULL) = (external_id IS NULL));
ALTER TABLE public."episodes" ADD CONSTRAINT "episodes_duration_seconds_check" CHECK (duration_seconds >= 0);
ALTER TABLE public."episodes" ADD CONSTRAINT "episodes_external_id_check" CHECK (external_id ~ '^[A-Za-z0-9_-]{6,40}$'::text);
ALTER TABLE public."episodes" ADD CONSTRAINT "episodes_pkey" PRIMARY KEY (id);
ALTER TABLE public."episodes" ADD CONSTRAINT "episodes_title_check" CHECK (char_length(title) >= 1 AND char_length(title) <= 200);
ALTER TABLE public."homepage_ad_slots" ADD CONSTRAINT "homepage_ad_slots_advertiser_check" CHECK (length(advertiser) <= 120);
ALTER TABLE public."homepage_ad_slots" ADD CONSTRAINT "homepage_ad_slots_alt_check" CHECK (length(alt) <= 300);
ALTER TABLE public."homepage_ad_slots" ADD CONSTRAINT "homepage_ad_slots_banner_check" CHECK (banner >= 1 AND banner <= 5);
ALTER TABLE public."homepage_ad_slots" ADD CONSTRAINT "homepage_ad_slots_image_url_check" CHECK (length(image_url) <= 700 AND (image_url = ''::text OR image_url ~ '^https?://'::text OR image_url ~ '^/[^/]'::text));
ALTER TABLE public."homepage_ad_slots" ADD CONSTRAINT "homepage_ad_slots_pkey" PRIMARY KEY (banner, slot);
ALTER TABLE public."homepage_ad_slots" ADD CONSTRAINT "homepage_ad_slots_slot_check" CHECK (slot >= 1 AND slot <= 5);
ALTER TABLE public."homepage_ad_slots" ADD CONSTRAINT "homepage_ad_slots_target_url_check" CHECK (length(target_url) <= 700 AND (target_url = ''::text OR target_url ~ '^https?://'::text));
ALTER TABLE public."legacy_article_import_queue" ADD CONSTRAINT "legacy_article_import_queue_attempts_check" CHECK (attempts >= 0);
ALTER TABLE public."legacy_article_import_queue" ADD CONSTRAINT "legacy_article_import_queue_legacy_id_check" CHECK (legacy_id >= 1000 AND legacy_id <= 250000);
ALTER TABLE public."legacy_article_import_queue" ADD CONSTRAINT "legacy_article_import_queue_pkey" PRIMARY KEY (legacy_id);
ALTER TABLE public."legacy_article_import_queue" ADD CONSTRAINT "legacy_article_import_queue_state_check" CHECK (state = ANY (ARRAY['pending'::text, 'retry'::text, 'imported'::text, 'skipped'::text, 'needs_imgbb'::text]));
ALTER TABLE public."live_distribution_channels" ADD CONSTRAINT "live_distribution_channels_name_check" CHECK (char_length(name) >= 2 AND char_length(name) <= 120);
ALTER TABLE public."live_distribution_channels" ADD CONSTRAINT "live_distribution_channels_pkey" PRIMARY KEY (id);
ALTER TABLE public."live_distribution_channels" ADD CONSTRAINT "live_distribution_channels_platform_check" CHECK (platform = ANY (ARRAY['youtube'::text, 'facebook'::text, 'tiktok'::text, 'twitch'::text, 'dailymotion'::text, 'vimeo'::text, 'restream'::text, 'mux'::text, 'cloudflare'::text, 'wowza'::text, 'castr'::text, 'custom'::text]));
ALTER TABLE public."live_stream_targets" ADD CONSTRAINT "live_stream_targets_direction_check" CHECK (direction = ANY (ARRAY['source'::text, 'destination'::text]));
ALTER TABLE public."live_stream_targets" ADD CONSTRAINT "live_stream_targets_name_check" CHECK (char_length(name) >= 2 AND char_length(name) <= 120);
ALTER TABLE public."live_stream_targets" ADD CONSTRAINT "live_stream_targets_pkey" PRIMARY KEY (id);
ALTER TABLE public."live_stream_targets" ADD CONSTRAINT "live_stream_targets_position_check" CHECK ("position" >= 0 AND "position" <= 999);
ALTER TABLE public."live_stream_targets" ADD CONSTRAINT "live_stream_targets_protocol_check" CHECK (protocol = ANY (ARRAY['rtmps'::text, 'rtmp'::text, 'srt'::text, 'whip'::text, 'platform'::text]));
ALTER TABLE public."live_streams" ADD CONSTRAINT "live_streams_check" CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at);
ALTER TABLE public."live_streams" ADD CONSTRAINT "live_streams_external_id_check" CHECK (external_id ~ '^[A-Za-z0-9_-]{6,40}$'::text);
ALTER TABLE public."live_streams" ADD CONSTRAINT "live_streams_pkey" PRIMARY KEY (id);
ALTER TABLE public."media" ADD CONSTRAINT "media_alt_check" CHECK (char_length(alt) <= 300);
ALTER TABLE public."media" ADD CONSTRAINT "media_bucket_path_key" UNIQUE (bucket, path);
ALTER TABLE public."media" ADD CONSTRAINT "media_height_check" CHECK (height > 0);
ALTER TABLE public."media" ADD CONSTRAINT "media_imgbb_url_host_check" CHECK (imgbb_url IS NULL OR imgbb_url ~ '^https://i[.]ibb[.]co/[A-Za-z0-9/_+.%-]+$'::text);
ALTER TABLE public."media" ADD CONSTRAINT "media_mime_type_check" CHECK (mime_type = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text, 'image/avif'::text]));
ALTER TABLE public."media" ADD CONSTRAINT "media_pkey" PRIMARY KEY (id);
ALTER TABLE public."media" ADD CONSTRAINT "media_size_bytes_check" CHECK (size_bytes > 0 AND size_bytes <= 5242880);
ALTER TABLE public."media" ADD CONSTRAINT "media_width_check" CHECK (width > 0);
ALTER TABLE public."news24_items" ADD CONSTRAINT "news24_items_guid_hash_check" CHECK (length(guid_hash) = 64);
ALTER TABLE public."news24_items" ADD CONSTRAINT "news24_items_original_url_check" CHECK (original_url ~ '^https://[^[:space:]]+$'::text);
ALTER TABLE public."news24_items" ADD CONSTRAINT "news24_items_pkey" PRIMARY KEY (id);
ALTER TABLE public."news24_items" ADD CONSTRAINT "news24_items_source_id_guid_hash_key" UNIQUE (source_id, guid_hash);
ALTER TABLE public."news24_items" ADD CONSTRAINT "news24_items_source_name_check" CHECK (char_length(source_name) >= 2 AND char_length(source_name) <= 130);
ALTER TABLE public."news24_items" ADD CONSTRAINT "news24_items_status_check" CHECK (status = ANY (ARRAY['published'::text, 'hidden'::text]));
ALTER TABLE public."news24_items" ADD CONSTRAINT "news24_items_summary_check" CHECK (char_length(summary) <= 480);
ALTER TABLE public."news24_items" ADD CONSTRAINT "news24_items_title_check" CHECK (char_length(title) >= 5 AND char_length(title) <= 300);
ALTER TABLE public."poll_votes" ADD CONSTRAINT "poll_votes_pkey" PRIMARY KEY (id);
ALTER TABLE public."poll_votes" ADD CONSTRAINT "poll_votes_poll_id_voter_hash_key" UNIQUE (poll_id, voter_hash);
ALTER TABLE public."polls" ADD CONSTRAINT "polls_options_check" CHECK (jsonb_typeof(options) = 'array'::text AND jsonb_array_length(options) >= 2 AND jsonb_array_length(options) <= 8);
ALTER TABLE public."polls" ADD CONSTRAINT "polls_pkey" PRIMARY KEY (id);
ALTER TABLE public."polls" ADD CONSTRAINT "polls_question_check" CHECK (char_length(question) >= 5 AND char_length(question) <= 300);
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_full_name_check" CHECK (char_length(full_name) <= 120);
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id);
ALTER TABLE public."program_slots" ADD CONSTRAINT "program_slots_pkey" PRIMARY KEY (id);
ALTER TABLE public."program_slots" ADD CONSTRAINT "program_slots_title_check" CHECK (char_length(title) >= 1 AND char_length(title) <= 160);
ALTER TABLE public."program_slots" ADD CONSTRAINT "program_slots_weekday_check" CHECK (weekday >= 1 AND weekday <= 7);
ALTER TABLE public."provinces" ADD CONSTRAINT "provinces_pkey" PRIMARY KEY (slug);
ALTER TABLE public."provinces" ADD CONSTRAINT "provinces_slug_check" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text);
ALTER TABLE public."roles" ADD CONSTRAINT "roles_pkey" PRIMARY KEY (key);
ALTER TABLE public."rss_sources" ADD CONSTRAINT "rss_sources_feed_url_check" CHECK (feed_url ~ '^https://[^[:space:]]+$'::text);
ALTER TABLE public."rss_sources" ADD CONSTRAINT "rss_sources_feed_url_key" UNIQUE (feed_url);
ALTER TABLE public."rss_sources" ADD CONSTRAINT "rss_sources_name_check" CHECK (char_length(name) >= 2 AND char_length(name) <= 100);
ALTER TABLE public."rss_sources" ADD CONSTRAINT "rss_sources_pkey" PRIMARY KEY (id);
ALTER TABLE public."shows" ADD CONSTRAINT "shows_pkey" PRIMARY KEY (id);
ALTER TABLE public."shows" ADD CONSTRAINT "shows_slug_check" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'::text);
ALTER TABLE public."shows" ADD CONSTRAINT "shows_slug_key" UNIQUE (slug);
ALTER TABLE public."shows" ADD CONSTRAINT "shows_title_check" CHECK (char_length(title) >= 1 AND char_length(title) <= 120);
ALTER TABLE public."site_live_settings" ADD CONSTRAINT "site_live_settings_hls_url_check" CHECK (length(hls_url) <= 1400 AND (hls_url = ''::text OR hls_url ~ '^https://'::text));
ALTER TABLE public."site_live_settings" ADD CONSTRAINT "site_live_settings_id_check" CHECK (id = 1);
ALTER TABLE public."site_live_settings" ADD CONSTRAINT "site_live_settings_pkey" PRIMARY KEY (id);
ALTER TABLE public."site_live_settings" ADD CONSTRAINT "site_live_settings_title_check" CHECK (length(title) <= 120);
ALTER TABLE public."videos" ADD CONSTRAINT "videos_check" CHECK (status <> 'published'::publication_status OR published_at IS NOT NULL);
ALTER TABLE public."videos" ADD CONSTRAINT "videos_duration_seconds_check" CHECK (duration_seconds >= 0);
ALTER TABLE public."videos" ADD CONSTRAINT "videos_external_id_check" CHECK (external_id ~ '^[A-Za-z0-9_-]{6,40}$'::text);
ALTER TABLE public."videos" ADD CONSTRAINT "videos_pkey" PRIMARY KEY (id);
ALTER TABLE public."videos" ADD CONSTRAINT "videos_platform_external_id_key" UNIQUE (platform, external_id);
ALTER TABLE public."videos" ADD CONSTRAINT "videos_title_check" CHECK (char_length(title) >= 1 AND char_length(title) <= 200);

-- FOREIGN KEYS: expect auth.users and referenced objects to exist on target.
ALTER TABLE public."ai_generations" ADD CONSTRAINT "ai_generations_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL;
ALTER TABLE public."ai_generations" ADD CONSTRAINT "ai_generations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
ALTER TABLE public."articles" ADD CONSTRAINT "articles_author_id_fkey" FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE RESTRICT;
ALTER TABLE public."articles" ADD CONSTRAINT "articles_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT;
ALTER TABLE public."articles" ADD CONSTRAINT "articles_cover_media_id_fkey" FOREIGN KEY (cover_media_id) REFERENCES media(id) ON DELETE SET NULL;
ALTER TABLE public."articles" ADD CONSTRAINT "articles_province_slug_fkey" FOREIGN KEY (province_slug) REFERENCES provinces(slug) ON DELETE SET NULL;
ALTER TABLE public."articles" ADD CONSTRAINT "articles_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public."articles" ADD CONSTRAINT "articles_subcategory_id_fkey" FOREIGN KEY (subcategory_id) REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE public."audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public."categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE RESTRICT;
ALTER TABLE public."contributions" ADD CONSTRAINT "contributions_moderated_by_fkey" FOREIGN KEY (moderated_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public."contributions" ADD CONSTRAINT "contributions_province_slug_fkey" FOREIGN KEY (province_slug) REFERENCES provinces(slug) ON DELETE SET NULL;
ALTER TABLE public."contributions" ADD CONSTRAINT "contributions_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE SET NULL;
ALTER TABLE public."editorial_watch_topics" ADD CONSTRAINT "editorial_watch_topics_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE public."editorial_watch_topics" ADD CONSTRAINT "editorial_watch_topics_draft_article_id_fkey" FOREIGN KEY (draft_article_id) REFERENCES articles(id) ON DELETE SET NULL;
ALTER TABLE public."editorial_watch_topics" ADD CONSTRAINT "editorial_watch_topics_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public."episodes" ADD CONSTRAINT "episodes_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE CASCADE;
ALTER TABLE public."legacy_article_import_queue" ADD CONSTRAINT "legacy_article_import_queue_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL;
ALTER TABLE public."media" ADD CONSTRAINT "media_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public."news24_items" ADD CONSTRAINT "news24_items_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE public."news24_items" ADD CONSTRAINT "news24_items_source_id_fkey" FOREIGN KEY (source_id) REFERENCES rss_sources(id) ON DELETE RESTRICT;
ALTER TABLE public."poll_votes" ADD CONSTRAINT "poll_votes_poll_id_fkey" FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE;
ALTER TABLE public."polls" ADD CONSTRAINT "polls_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_role_fkey" FOREIGN KEY (role) REFERENCES roles(key);
ALTER TABLE public."program_slots" ADD CONSTRAINT "program_slots_show_id_fkey" FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE SET NULL;
ALTER TABLE public."rss_sources" ADD CONSTRAINT "rss_sources_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE public."shows" ADD CONSTRAINT "shows_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE public."shows" ADD CONSTRAINT "shows_cover_media_id_fkey" FOREIGN KEY (cover_media_id) REFERENCES media(id) ON DELETE SET NULL;
ALTER TABLE public."videos" ADD CONSTRAINT "videos_article_id_fkey" FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE SET NULL;
ALTER TABLE public."videos" ADD CONSTRAINT "videos_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE public."videos" ADD CONSTRAINT "videos_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- Additional indexes
CREATE INDEX ai_generations_article_idx ON public.ai_generations USING btree (article_id) WHERE (article_id IS NOT NULL);
CREATE INDEX ai_generations_cache_idx ON public.ai_generations USING btree (kind, input_hash);
CREATE INDEX ai_generations_user_idx ON public.ai_generations USING btree (user_id, created_at DESC);
CREATE INDEX articles_author_idx ON public.articles USING btree (author_id);
CREATE INDEX articles_category_idx ON public.articles USING btree (category_id, published_at DESC);
CREATE INDEX articles_province_idx ON public.articles USING btree (province_slug) WHERE (province_slug IS NOT NULL);
CREATE INDEX articles_public_idx ON public.articles USING btree (published_at DESC) WHERE (status = ANY (ARRAY['published'::article_status, 'scheduled'::article_status]));
CREATE INDEX articles_search_idx ON public.articles USING gin (search);
CREATE UNIQUE INDEX articles_short_code_unique_idx ON public.articles USING btree (short_code);
CREATE INDEX articles_status_idx ON public.articles USING btree (status, updated_at DESC);
CREATE INDEX articles_tags_idx ON public.articles USING gin (tags);
CREATE INDEX audit_logs_actor_idx ON public.audit_logs USING btree (actor_id);
CREATE INDEX audit_logs_created_at_idx ON public.audit_logs USING btree (created_at DESC);
CREATE INDEX audit_logs_entity_idx ON public.audit_logs USING btree (entity, entity_id);
CREATE INDEX categories_parent_idx ON public.categories USING btree (parent_id);
CREATE INDEX contributions_queue_idx ON public.contributions USING btree (status, created_at DESC);
CREATE INDEX contributions_sender_idx ON public.contributions USING btree (sender_hash, created_at DESC) WHERE (sender_hash IS NOT NULL);
CREATE INDEX editorial_watch_recent_idx ON public.editorial_watch_topics USING btree (first_seen_at DESC);
CREATE INDEX editorial_watch_source_items_idx ON public.editorial_watch_topics USING gin (source_item_ids);
CREATE INDEX editorial_watch_status_idx ON public.editorial_watch_topics USING btree (status, first_seen_at DESC);
CREATE INDEX episodes_public_idx ON public.episodes USING btree (aired_at DESC) WHERE (status = 'published'::publication_status);
CREATE INDEX episodes_publish_queue_idx ON public.episodes USING btree (publish_at) WHERE ((status = 'draft'::publication_status) AND (publish_at IS NOT NULL));
CREATE INDEX episodes_show_idx ON public.episodes USING btree (show_id, aired_at DESC);
CREATE INDEX legacy_article_queue_imported_idx ON public.legacy_article_import_queue USING btree (imported_at) WHERE (state = 'imported'::text);
CREATE INDEX legacy_article_queue_pending_idx ON public.legacy_article_import_queue USING btree (state, next_attempt_at, legacy_id);
CREATE INDEX live_distribution_channels_position_idx ON public.live_distribution_channels USING btree ("position", name);
CREATE INDEX idx_live_stream_targets_position ON public.live_stream_targets USING btree ("position", created_at);
CREATE UNIQUE INDEX live_streams_single_active_idx ON public.live_streams USING btree (is_active) WHERE is_active;
CREATE INDEX media_created_at_idx ON public.media USING btree (created_at DESC);
CREATE INDEX media_uploaded_by_idx ON public.media USING btree (uploaded_by);
CREATE INDEX news24_category_pub_idx ON public.news24_items USING btree (category_id, published_at DESC) WHERE (status = 'published'::text);
CREATE UNIQUE INDEX news24_guid_global_unique ON public.news24_items USING btree (guid_hash);
CREATE INDEX news24_published_idx ON public.news24_items USING btree (published_at DESC) WHERE (status = 'published'::text);
CREATE INDEX news24_source_idx ON public.news24_items USING btree (source_id, imported_at DESC);
CREATE INDEX poll_votes_poll_idx ON public.poll_votes USING btree (poll_id, option_id);
CREATE INDEX profiles_role_idx ON public.profiles USING btree (role);
CREATE INDEX program_slots_time_idx ON public.program_slots USING btree (weekday, start_time);
CREATE INDEX rss_sources_enabled_idx ON public.rss_sources USING btree (enabled) WHERE enabled;
CREATE INDEX videos_article_idx ON public.videos USING btree (article_id) WHERE (article_id IS NOT NULL);
CREATE INDEX videos_public_idx ON public.videos USING btree (published_at DESC) WHERE (status = 'published'::publication_status);

-- RLS policies and triggers below are listed as COMMENTS; their functions and role model are not portable.
-- ai_generations: RLS ENABLED
-- articles: RLS ENABLED
-- audit_logs: RLS ENABLED
-- categories: RLS ENABLED
-- contributions: RLS ENABLED
-- editorial_watch_runs: RLS ENABLED
-- editorial_watch_topics: RLS ENABLED
-- episodes: RLS ENABLED
-- homepage_ad_slots: RLS ENABLED
-- legacy_article_import_queue: RLS ENABLED
-- live_distribution_channels: RLS ENABLED
-- live_stream_targets: RLS ENABLED
-- live_streams: RLS ENABLED
-- media: RLS ENABLED
-- news24_items: RLS ENABLED
-- poll_votes: RLS ENABLED
-- polls: RLS ENABLED
-- profiles: RLS ENABLED
-- program_slots: RLS ENABLED
-- provinces: RLS ENABLED
-- roles: RLS ENABLED
-- rss_sources: RLS ENABLED
-- shows: RLS ENABLED
-- site_live_settings: RLS ENABLED
-- videos: RLS ENABLED
-- Trigger articles.articles_audit: CREATE TRIGGER articles_audit AFTER INSERT OR DELETE OR UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION audit_row('id', 'title', 'slug', 'status', 'published_at', 'author_id')
-- Trigger articles.articles_before_write: CREATE TRIGGER articles_before_write BEFORE INSERT OR UPDATE ON articles FOR EACH ROW EXECUTE FUNCTION articles_before_write()
-- Trigger articles.articles_preserve_short_code: CREATE TRIGGER articles_preserve_short_code BEFORE UPDATE OF short_code ON articles FOR EACH ROW EXECUTE FUNCTION preserve_article_short_code()
-- Trigger categories.categories_audit: CREATE TRIGGER categories_audit AFTER INSERT OR DELETE OR UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION audit_row('id', 'slug', 'name', 'parent_id')
-- Trigger categories.categories_set_updated_at: CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at()
-- Trigger contributions.contributions_audit: CREATE TRIGGER contributions_audit AFTER DELETE OR UPDATE ON contributions FOR EACH ROW EXECUTE FUNCTION audit_row('id', 'status', 'kind')
-- Trigger episodes.episodes_set_updated_at: CREATE TRIGGER episodes_set_updated_at BEFORE UPDATE ON episodes FOR EACH ROW EXECUTE FUNCTION set_updated_at()
-- Trigger live_distribution_channels.live_distribution_channels_updated: CREATE TRIGGER live_distribution_channels_updated BEFORE UPDATE ON live_distribution_channels FOR EACH ROW EXECUTE FUNCTION set_updated_at()
-- Trigger live_streams.live_streams_set_updated_at: CREATE TRIGGER live_streams_set_updated_at BEFORE UPDATE ON live_streams FOR EACH ROW EXECUTE FUNCTION set_updated_at()
-- Trigger polls.polls_set_updated_at: CREATE TRIGGER polls_set_updated_at BEFORE UPDATE ON polls FOR EACH ROW EXECUTE FUNCTION set_updated_at()
-- Trigger profiles.profiles_audit: CREATE TRIGGER profiles_audit AFTER UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION audit_row('id', 'role', 'is_active')
-- Trigger profiles.profiles_protect_privileges: CREATE TRIGGER profiles_protect_privileges BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION protect_profile_privileges()
-- Trigger roles.roles_audit: CREATE TRIGGER roles_audit AFTER UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION audit_row('key', 'permissions', 'label')
-- Trigger rss_sources.rss_sources_set_updated_at: CREATE TRIGGER rss_sources_set_updated_at BEFORE UPDATE ON rss_sources FOR EACH ROW EXECUTE FUNCTION set_updated_at()
-- Trigger shows.shows_set_updated_at: CREATE TRIGGER shows_set_updated_at BEFORE UPDATE ON shows FOR EACH ROW EXECUTE FUNCTION set_updated_at()
-- Trigger videos.videos_set_updated_at: CREATE TRIGGER videos_set_updated_at BEFORE UPDATE ON videos FOR EACH ROW EXECUTE FUNCTION set_updated_at()
-- Policy ai_generations.ai_generations_insert (INSERT) roles={authenticated} USING N/A CHECK ((user_id = ( SELECT auth.uid() AS uid)) AND ( SELECT has_permission('ai.use'::text) AS has_permission))
-- Policy ai_generations.ai_generations_select (SELECT) roles={authenticated} USING ((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT has_permission('ai.read_all'::text) AS has_permission)) CHECK N/A
-- Policy articles.articles_delete (DELETE) roles={authenticated} USING (( SELECT has_permission('articles.review'::text) AS has_permission) OR (( SELECT has_permission('articles.edit_own'::text) AS has_permission) AND (author_id = ( SELECT auth.uid() AS uid)) AND (status = 'draft'::article_status))) CHECK N/A
-- Policy articles.articles_insert (INSERT) roles={authenticated} USING N/A CHECK (( SELECT has_permission('articles.review'::text) AS has_permission) OR (( SELECT has_permission('articles.create'::text) AS has_permission) AND (author_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['draft'::article_status, 'in_review'::article_status]))))
-- Policy articles.articles_select (SELECT) roles={anon,authenticated} USING (((status = ANY (ARRAY['published'::article_status, 'scheduled'::article_status])) AND (published_at <= now())) OR ( SELECT has_permission('articles.read_all'::text) AS has_permission)) CHECK N/A
-- Policy articles.articles_update (UPDATE) roles={authenticated} USING (( SELECT has_permission('articles.review'::text) AS has_permission) OR (( SELECT has_permission('articles.edit_own'::text) AS has_permission) AND (author_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['draft'::article_status, 'in_review'::article_status])))) CHECK (( SELECT has_permission('articles.review'::text) AS has_permission) OR (( SELECT has_permission('articles.edit_own'::text) AS has_permission) AND (author_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['draft'::article_status, 'in_review'::article_status]))))
-- Policy audit_logs.audit_logs_select (SELECT) roles={authenticated} USING ( SELECT has_permission('audit.read'::text) AS has_permission) CHECK N/A
-- Policy categories.categories_delete (DELETE) roles={authenticated} USING ( SELECT has_permission('categories.manage'::text) AS has_permission) CHECK N/A
-- Policy categories.categories_insert (INSERT) roles={authenticated} USING N/A CHECK ( SELECT has_permission('categories.manage'::text) AS has_permission)
-- Policy categories.categories_select (SELECT) roles={anon,authenticated} USING true CHECK N/A
-- Policy categories.categories_update (UPDATE) roles={authenticated} USING ( SELECT has_permission('categories.manage'::text) AS has_permission) CHECK ( SELECT has_permission('categories.manage'::text) AS has_permission)
-- Policy contributions.contributions_delete (DELETE) roles={authenticated} USING ( SELECT has_permission('contributions.moderate'::text) AS has_permission) CHECK N/A
-- Policy contributions.contributions_select (SELECT) roles={authenticated} USING ( SELECT has_permission('contributions.moderate'::text) AS has_permission) CHECK N/A
-- Policy contributions.contributions_update (UPDATE) roles={authenticated} USING ( SELECT has_permission('contributions.moderate'::text) AS has_permission) CHECK ( SELECT has_permission('contributions.moderate'::text) AS has_permission)
-- Policy editorial_watch_runs.editorial_watch_runs_editor_read (SELECT) roles={authenticated} USING ( SELECT has_permission('articles.review'::text) AS has_permission) CHECK N/A
-- Policy editorial_watch_topics.editorial_watch_editor_read (SELECT) roles={authenticated} USING ( SELECT has_permission('articles.review'::text) AS has_permission) CHECK N/A
-- Policy editorial_watch_topics.editorial_watch_editor_update (UPDATE) roles={authenticated} USING ( SELECT has_permission('articles.review'::text) AS has_permission) CHECK ( SELECT has_permission('articles.review'::text) AS has_permission)
-- Policy episodes.episodes_select (SELECT) roles={anon,authenticated} USING ((status = 'published'::publication_status) OR (( SELECT current_app_role() AS current_app_role) IS NOT NULL)) CHECK N/A
-- Policy episodes.episodes_write (ALL) roles={authenticated} USING ( SELECT has_permission('shows.manage'::text) AS has_permission) CHECK ( SELECT has_permission('shows.manage'::text) AS has_permission)
-- Policy homepage_ad_slots.homepage_ad_admin_read (SELECT) roles={authenticated} USING ((active AND (image_url <> ''::text)) OR ( SELECT has_permission('settings.manage'::text) AS has_permission)) CHECK N/A
-- Policy homepage_ad_slots.homepage_ad_admin_update (UPDATE) roles={authenticated} USING ( SELECT has_permission('settings.manage'::text) AS has_permission) CHECK ( SELECT has_permission('settings.manage'::text) AS has_permission)
-- Policy homepage_ad_slots.homepage_ad_public (SELECT) roles={anon} USING (active AND (image_url <> ''::text)) CHECK N/A
-- Policy live_distribution_channels.live_distribution_manage (ALL) roles={authenticated} USING ( SELECT has_permission('schedule.manage'::text) AS has_permission) CHECK ( SELECT has_permission('schedule.manage'::text) AS has_permission)
-- Policy live_streams.live_streams_select (SELECT) roles={anon,authenticated} USING (is_active OR (( SELECT current_app_role() AS current_app_role) IS NOT NULL)) CHECK N/A
-- Policy live_streams.live_streams_write (ALL) roles={authenticated} USING ( SELECT has_permission('schedule.manage'::text) AS has_permission) CHECK ( SELECT has_permission('schedule.manage'::text) AS has_permission)
-- Policy media.media_delete (DELETE) roles={authenticated} USING (( SELECT has_permission('media.manage'::text) AS has_permission) OR ((uploaded_by = ( SELECT auth.uid() AS uid)) AND ( SELECT has_permission('media.upload'::text) AS has_permission))) CHECK N/A
-- Policy media.media_insert (INSERT) roles={authenticated} USING N/A CHECK (( SELECT has_permission('media.upload'::text) AS has_permission) AND (uploaded_by = ( SELECT auth.uid() AS uid)))
-- Policy media.media_select (SELECT) roles={anon,authenticated} USING true CHECK N/A
-- Policy media.media_update (UPDATE) roles={authenticated} USING (( SELECT has_permission('media.manage'::text) AS has_permission) OR ((uploaded_by = ( SELECT auth.uid() AS uid)) AND ( SELECT has_permission('media.upload'::text) AS has_permission))) CHECK (( SELECT has_permission('media.manage'::text) AS has_permission) OR ((uploaded_by = ( SELECT auth.uid() AS uid)) AND ( SELECT has_permission('media.upload'::text) AS has_permission)))
-- Policy news24_items.news24_editor_read (SELECT) roles={authenticated} USING ( SELECT has_permission('articles.review'::text) AS has_permission) CHECK N/A
-- Policy news24_items.news24_editor_update (UPDATE) roles={authenticated} USING ( SELECT has_permission('articles.review'::text) AS has_permission) CHECK ( SELECT has_permission('articles.review'::text) AS has_permission)
-- Policy news24_items.news24_public_read (SELECT) roles={anon,authenticated} USING (status = 'published'::text) CHECK N/A
-- Policy poll_votes.poll_votes_select (SELECT) roles={authenticated} USING ( SELECT has_permission('polls.manage'::text) AS has_permission) CHECK N/A
-- Policy polls.polls_select (SELECT) roles={anon,authenticated} USING ((status = ANY (ARRAY['open'::poll_status, 'closed'::poll_status])) OR (( SELECT current_app_role() AS current_app_role) IS NOT NULL)) CHECK N/A
-- Policy polls.polls_write (ALL) roles={authenticated} USING ( SELECT has_permission('polls.manage'::text) AS has_permission) CHECK ( SELECT has_permission('polls.manage'::text) AS has_permission)
-- Policy profiles.profiles_published_author_select (SELECT) roles={anon,authenticated} USING (EXISTS ( SELECT 1
   FROM articles a
  WHERE ((a.author_id = profiles.id) AND (a.status = ANY (ARRAY['published'::article_status, 'scheduled'::article_status])) AND (a.published_at <= now())))) CHECK N/A
-- Policy profiles.profiles_select (SELECT) roles={authenticated} USING ((id = ( SELECT auth.uid() AS uid)) OR (( SELECT current_app_role() AS current_app_role) IS NOT NULL)) CHECK N/A
-- Policy profiles.profiles_update (UPDATE) roles={authenticated} USING ((id = ( SELECT auth.uid() AS uid)) OR ( SELECT has_permission('users.manage'::text) AS has_permission)) CHECK ((id = ( SELECT auth.uid() AS uid)) OR ( SELECT has_permission('users.manage'::text) AS has_permission))
-- Policy program_slots.program_slots_select (SELECT) roles={anon,authenticated} USING true CHECK N/A
-- Policy program_slots.program_slots_write (ALL) roles={authenticated} USING ( SELECT has_permission('schedule.manage'::text) AS has_permission) CHECK ( SELECT has_permission('schedule.manage'::text) AS has_permission)
-- Policy provinces.provinces_select (SELECT) roles={anon,authenticated} USING true CHECK N/A
-- Policy provinces.provinces_write (ALL) roles={authenticated} USING ( SELECT has_permission('settings.manage'::text) AS has_permission) CHECK ( SELECT has_permission('settings.manage'::text) AS has_permission)
-- Policy roles.roles_select (SELECT) roles={authenticated} USING true CHECK N/A
-- Policy roles.roles_update (UPDATE) roles={authenticated} USING ( SELECT has_permission('roles.manage'::text) AS has_permission) CHECK ( SELECT has_permission('roles.manage'::text) AS has_permission)
-- Policy rss_sources.rss_sources_manage (ALL) roles={authenticated} USING ( SELECT has_permission('articles.review'::text) AS has_permission) CHECK ( SELECT has_permission('articles.review'::text) AS has_permission)
-- Policy shows.shows_select (SELECT) roles={anon,authenticated} USING (is_active OR (( SELECT current_app_role() AS current_app_role) IS NOT NULL)) CHECK N/A
-- Policy shows.shows_write (ALL) roles={authenticated} USING ( SELECT has_permission('shows.manage'::text) AS has_permission) CHECK ( SELECT has_permission('shows.manage'::text) AS has_permission)
-- Policy site_live_settings.site_live_admin_read (SELECT) roles={authenticated} USING (enabled OR ( SELECT has_permission('schedule.manage'::text) AS has_permission)) CHECK N/A
-- Policy site_live_settings.site_live_admin_update (UPDATE) roles={authenticated} USING ( SELECT has_permission('schedule.manage'::text) AS has_permission) CHECK ( SELECT has_permission('schedule.manage'::text) AS has_permission)
-- Policy site_live_settings.site_live_public (SELECT) roles={anon} USING enabled CHECK N/A
-- Policy videos.videos_select (SELECT) roles={anon,authenticated} USING ((status = 'published'::publication_status) OR (( SELECT current_app_role() AS current_app_role) IS NOT NULL)) CHECK N/A
-- Policy videos.videos_write (ALL) roles={authenticated} USING ( SELECT has_permission('videos.manage'::text) AS has_permission) CHECK ( SELECT has_permission('videos.manage'::text) AS has_permission)

-- Review required functions (implement/restore separately):
-- articles_before_write() security_definer=false
-- audit_row() security_definer=true
-- current_app_role() security_definer=true
-- handle_new_user() security_definer=true
-- has_permission(permission text) security_definer=true
-- poll_results(target_poll uuid) security_definer=true
-- preserve_article_short_code() security_definer=false
-- protect_profile_privileges() security_definer=true
-- rls_auto_enable() security_definer=true
-- set_updated_at() security_definer=false
-- tvplus_delete_live_target(p_id uuid) security_definer=true
-- tvplus_legacy_imgbb_key() security_definer=true
-- tvplus_save_live_target(p_id uuid, p_name text, p_provider text, p_direction text, p_protocol text, p_watch_url text, p_enabled boolean, p_position integer, p_notes text, p_endpoint text, p_stream_key text, p_clear_endpoint boolean, p_clear_key boolean) security_definer=true
-- tvplus_verify_news24_scheduler(candidate text) security_definer=true
