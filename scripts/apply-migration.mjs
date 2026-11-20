import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function getToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  const raw = execFileSync('security', ['find-generic-password', '-s', 'Supabase CLI', '-w'], {
    encoding: 'utf8',
  }).trim();
  // Le CLI stocke parfois le jeton encodé en base64.
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    return /^[\w-]+$/.test(decoded) && decoded.length > 20 ? decoded : raw;
  } catch {
    return raw;
  }
}

function splitSql(sql) {
  const statements = [];
  let current = '';
  let i = 0;
  let dollar = null;
  let single = false;
  let lineComment = false;
  let blockComment = false;

  while (i < sql.length) {
    const c = sql[i];
    const n = sql[i + 1];

    if (lineComment) {
      current += c;
      if (c === '\n') lineComment = false;
      i++;
      continue;
    }
    if (blockComment) {
      if (c === '*' && n === '/') {
        current += '*/';
        i += 2;
        blockComment = false;
      } else {
        current += c;
        i++;
      }
      continue;
    }
    if (dollar) {
      if (sql.startsWith(dollar, i)) {
        current += dollar;
        i += dollar.length;
        dollar = null;
      } else {
        current += c;
        i++;
      }
      continue;
    }
    if (single) {
      current += c;
      if (c === '\\' && n) {
        current += n;
        i += 2;
      } else {
        if (c === "'") single = false;
        i++;
      }
      continue;
    }
    if (c === '-' && n === '-') {
      lineComment = true;
      current += c;
      i++;
      continue;
    }
    if (c === '/' && n === '*') {
      blockComment = true;
      current += '/*';
      i += 2;
      continue;
    }
    if (c === "'") {
      single = true;
      current += c;
      i++;
      continue;
    }
    if (c === '$') {
      const match = sql.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (match) {
        dollar = match[0];
        current += dollar;
        i += dollar.length;
        continue;
      }
    }
    if (c === ';') {
      const cleaned = current.replace(/^\s*--.*$/gm, '').trim();
      if (cleaned) statements.push(cleaned);
      current = '';
      i++;
      continue;
    }
    current += c;
    i++;
  }
  const last = current.replace(/^\s*--.*$/gm, '').trim();
  if (last) statements.push(last);
  return statements;
}

async function main() {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error('SUPABASE_URL manquante');
  const ref = new URL(url).hostname.split('.')[0];
  const token = getToken();
  const files = process.argv.slice(2);
  if (!files.length) files.push('supabase/migrations/0001_init.sql', 'supabase/seed.sql');

  let okCount = 0;
  for (const file of files) {
    const sql = readFileSync(resolve(root, file), 'utf8');
    const statements = splitSql(sql);
    console.log(`${file}: ${statements.length} instructions`);
    for (const [index, query] of statements.entries()) {
      const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Échec ${file} instruction ${index + 1} (HTTP ${response.status}): ${body.slice(0, 400)}`);
      }
      okCount++;
    }
  }
  console.log(`MIGRATION_OK (${okCount} instructions exécutées)`);
}

main().catch((error) => {
  console.error('MIGRATION_FAILED:', error.message);
  process.exit(1);
});
