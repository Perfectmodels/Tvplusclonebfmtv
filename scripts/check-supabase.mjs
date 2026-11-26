import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.log('MISSING_ENV');
  process.exit(0);
}
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error } = await db.from('articles').select('id').limit(1);
console.log(error ? 'ARTICLES_TABLE_MISSING_OR_DENIED' : 'ARTICLES_TABLE_OK');
