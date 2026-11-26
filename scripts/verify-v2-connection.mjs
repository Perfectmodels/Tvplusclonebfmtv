import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error('SUPABASE_URL ou SUPABASE_PUBLISHABLE_KEY absent.');
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const checks = [
  ['Catégories', 'categories', 'id,slug,name'],
  ['Articles', 'articles', 'id,slug,title,excerpt'],
  ['Médias', 'media', 'id,imgbb_url'],
  ['News 24/7', 'news24_items', 'id,title,original_url'],
];
let errors = 0;
for (const [label, table, columns] of checks) {
  let query = db.from(table).select(columns).limit(1);
  if (table === 'articles' || table === 'news24_items') query = query.eq('status', 'published');
  const { data, error } = await query;
  if (error) {
    console.error(`[ERREUR] ${label}: ${error.message}`);
    errors++;
  } else {
    console.log(`[OK] ${label}: ${data?.length ?? 0} résultat(s) test.`);
  }
}
process.exitCode = errors ? 1 : 0;
