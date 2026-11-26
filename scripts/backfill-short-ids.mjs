import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const gen = () => randomBytes(6).toString('base64url').slice(0, 7);
const { data: rows, error } = await db.from('articles').select('id, short_id').is('deleted_at', null);
if (error) throw error;
let count = 0;
for (const row of rows) {
  if (row.short_id) continue;
  for (let attempt = 0; attempt < 5; attempt++) {
    const shortId = gen();
    const { error: updateError } = await db.from('articles').update({ short_id: shortId }).eq('id', row.id).is('short_id', null);
    if (!updateError) { count++; break; }
  }
}
console.log('SHORT_IDS_ASSIGNED', count);
