export type DbStatus = 'draft' | 'published' | 'archived';
export type ContentKind = 'live' | 'alert' | 'video' | 'direct' | null;

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type ArticleRow = {
  id: string;
  slug: string;
  short_id: string | null;
  title: string;
  summary: string;
  body: string | null;
  category_slug: string;
  image_url: string | null;
  author: string | null;
  status: DbStatus;
  featured: boolean;
  is_alert: boolean;
  kind: ContentKind;
  published_at: string | null;
  source_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  chapter: string | null;
  content_json: Record<string, unknown> | null;
  content_html: string | null;
  country_code: string;
  province: string | null;
  tags: string[];
  keywords: string[];
  canonical_url: string | null;
  robots: string;
  cover_alt: string | null;
  cover_credit: string | null;
  cover_caption: string | null;
  source_media_id: string | null;
  word_count: number;
  reading_time: number;
  version: number;
  created_at: string;
  updated_at: string;
};

export type FilActuRow = {
  id: string;
  article_slug: string;
  time_label: string;
  position: number;
  created_at: string;
};

export type VideoRow = {
  id: string;
  slug: string;
  title: string;
  category_slug: string;
  image_url: string | null;
  duration: string;
  description: string | null;
  source_url: string | null;
  published_at: string | null;
  created_at: string;
};

export type ProgramRow = {
  id: string;
  slug: string;
  name: string;
  host: string | null;
  slot: string;
  category: string;
  image_url: string | null;
  description: string | null;
  created_at: string;
};

export type PodcastRow = VideoRow;

export type ChannelRow = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  kind: string;
  image_url: string | null;
  created_at: string;
};

export type NewsletterRow = {
  id: string;
  email: string;
  newsletter: string;
  created_at: string;
};

export type ContactRow = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
};

export type TestimonialRow = {
  id: string;
  title: string;
  place: string;
  image_url: string | null;
  published: boolean;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: 'reader' | 'admin';
  created_at: string;
};

export type TopicRow = { id: number; label: string; link: string };
export type NewsletterFormatRow = { id: string; name: string; frequency: string; description: string };
export type PracticalServiceRow = { id: string; name: string; description: string; href: string; icon: string };
export type TvScheduleRow = { id: string; time_label: string; title: string; category: string; is_live: boolean };

export type EpisodeRow = {
  id: string;
  program_id: string | null;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration: string;
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StreamSettingRow = {
  provider: string;
  label: string;
  rtmp_url: string | null;
  stream_key: string | null;
  enabled: boolean;
  instructions: string | null;
  updated_at: string;
};

export type QuestionRow = {
  id: string;
  name: string;
  email: string;
  question: string;
  status: 'new' | 'answered' | 'archived';
  answer: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      categories: { Row: CategoryRow };
      articles: { Row: ArticleRow };
      fil_actu: { Row: FilActuRow };
      videos: { Row: VideoRow };
      programs: { Row: ProgramRow };
      podcasts: { Row: PodcastRow };
      channels: { Row: ChannelRow };
      newsletter_subscriptions: { Row: NewsletterRow };
      contacts: { Row: ContactRow };
      testimonials: { Row: TestimonialRow };
      profiles: { Row: ProfileRow };
      site_topics: { Row: TopicRow };
      newsletter_formats: { Row: NewsletterFormatRow };
      practical_services: { Row: PracticalServiceRow };
      tv_schedule: { Row: TvScheduleRow };
      episodes: { Row: EpisodeRow };
      stream_settings: { Row: StreamSettingRow };
      questions: { Row: QuestionRow };
    };
  };
};

export type DataSource = 'mysql' | 'supabase' | 'static';

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  source: DataSource;
};
