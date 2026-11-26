import { createClient } from '@supabase/supabase-js';

const email = process.argv[2];
if (!email) {
  console.error('Usage: node --env-file=.env scripts/promote-admin.mjs <email>');
  process.exit(1);
}
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data: list, error: listError } = await db.auth.admin.listUsers();
if (listError) throw listError;
const user = list.users.find((u) => u.email === email);
if (!user) {
  console.error('Utilisateur introuvable :', email);
  process.exit(1);
}
const { error } = await db.from('profiles').update({ role: 'admin' }).eq('id', user.id);
if (error) throw error;
console.log('ADMIN_PROMOTED', email);
