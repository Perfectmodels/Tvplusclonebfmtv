import { execFileSync } from 'node:child_process';

const raw = process.env.SUPABASE_ACCESS_TOKEN || execFileSync('security', ['find-generic-password', '-s', 'Supabase CLI', '-w'], { encoding: 'utf8' }).trim();
let token = raw;
try {
  const decoded = Buffer.from(raw, 'base64').toString('utf8');
  if (/^[\w-]+$/.test(decoded) && decoded.length > 20) token = decoded;
} catch {}

const ref = new URL(process.env.SUPABASE_URL).hostname.split('.')[0];

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

const [tables, policies, triggers, counts] = await Promise.all([
  sql("select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by table_name"),
  sql("select tablename, policyname from pg_policies where schemaname='public' order by tablename, policyname"),
  sql("select event_object_table as table_name, trigger_name from information_schema.triggers where trigger_schema='public' group by 1,2 order by 1,2"),
  sql("select 'articles' t, count(*) n from public.articles union all select 'categories', count(*) from public.categories union all select 'fil_actu', count(*) from public.fil_actu union all select 'videos', count(*) from public.videos union all select 'programs', count(*) from public.programs union all select 'podcasts', count(*) from public.podcasts union all select 'channels', count(*) from public.channels union all select 'testimonials', count(*) from public.testimonials"),
]);

console.log('TABLES:', tables.map((r) => r.table_name).join(', '));
console.log('RLS POLICIES:', policies.length);
console.log('TRIGGERS:', triggers.map((t) => t.table_name + '.' + t.trigger_name).join(', '));
console.log('ROWS:', counts.map((c) => c.t + '=' + c.n).join(' '));
