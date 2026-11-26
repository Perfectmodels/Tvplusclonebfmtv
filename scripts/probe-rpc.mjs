import { createClient } from '@supabase/supabase-js';

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const candidates = ['exec_sql', 'execute_sql', 'run_sql', 'sql', 'query', 'pg_execute', 'exec', 'admin_exec_sql'];
for (const fn of candidates) {
  const { error } = await db.rpc(fn, { sql: 'select 1' });
  if (!error) console.log('RPC_AVAILABLE', fn);
}
console.log('RPC_PROBE_DONE');
