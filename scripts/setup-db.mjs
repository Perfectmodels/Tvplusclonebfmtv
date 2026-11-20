import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error('Variables Supabase manquantes dans .env');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const required = ['categories', 'articles', 'fil_actu', 'videos', 'programs', 'podcasts', 'channels', 'testimonials', 'newsletter_subscriptions', 'contacts'];
const missing = [];

for (const table of required) {
  const { error } = await db.from(table).select('id').limit(1);
  if (error) missing.push(table);
}

if (missing.length === 0) {
  console.log('OK — le schéma Supabase est en place.');
  process.exit(0);
}

console.log('Tables manquantes : ' + missing.join(', '));
console.log('\nProcédure :');
console.log('1. Ouvrir Supabase > SQL Editor');
console.log('2. Exécuter supabase/migrations/0001_init.sql');
console.log('3. Exécuter supabase/seed.sql (données de démonstration)');
console.log('4. Relancer : node --env-file=.env scripts/setup-db.mjs');
