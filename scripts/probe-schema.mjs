import { createClient } from '@supabase/supabase-js';

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const names = [
  'articles', 'stories', 'categories', 'news', 'posts', 'videos', 'programs', 'podcasts',
  'newsletter_subscriptions', 'contacts', 'testimonials', 'profiles', 'users', 'alerts',
  'fil_actu', 'media', 'channels', 'settings', 'page_views', 'events',
];
const found = [];
for (const name of names) {
  const { error } = await db.from(name).select('*').limit(1);
  if (!error) found.push(name);
}
console.log('EXISTING_TABLES', found.length ? found.join(', ') : '(none of the probed names)');
