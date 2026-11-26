import { createClient } from '@supabase/supabase-js';

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) {
  console.error('ADMIN_EMAIL et ADMIN_PASSWORD sont requis.');
  process.exit(1);
}

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: list, error: listError } = await db.auth.admin.listUsers();
if (listError) throw listError;
let user = list.users.find((u) => u.email === email);

if (user) {
  const { data, error } = await db.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Administrateur TV Plus' },
  });
  if (error) throw error;
  user = data.user;
  console.log('ADMIN_USER_UPDATED');
} else {
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Administrateur TV Plus' },
  });
  if (error) throw error;
  user = data.user;
  console.log('ADMIN_USER_CREATED');
}

const { error: profileError } = await db.from('profiles').upsert({
  id: user.id,
  email,
  full_name: 'Administrateur TV Plus',
  role: 'admin',
});
if (profileError) throw profileError;
console.log('ADMIN_ROLE_SET', email);
