import { NextRequest } from 'next/server';
import { z } from 'zod';
import { listArticles } from '../../../lib/db/repository';
import { getServerSupabase } from '../../../lib/supabase/server';
import { requireAdmin } from '../../../lib/api/auth';
import { rateLimit } from '../../../lib/api/rate-limit';
import { handleRoute, ok, created } from '../../../lib/api/response';
import { parseJson, slugSchema } from '../../../lib/api/validate';

export const dynamic = 'force-dynamic';

const createSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(5).max(250),
  summary: z.string().trim().min(10).max(600),
  body: z.string().optional(),
  category_slug: z.string().trim().min(2).max(80),
  image_url: z.string().url().optional().nullable(),
  author: z.string().trim().max(120).optional(),
  kind: z.enum(['live', 'alert', 'video', 'direct']).optional().nullable(),
  featured: z.boolean().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
});

export const GET = handleRoute(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
  const pageSize = Math.min(48, Math.max(1, Number(params.get('pageSize') ?? 12) || 12));
  const result = await listArticles({
    category: params.get('category') ?? undefined,
    search: params.get('q') ?? undefined,
    page,
    pageSize,
  });
  return ok(result);
});

export const POST = handleRoute(async (request: NextRequest) => {
  requireAdmin(request);
  rateLimit(request, { limit: 60, windowMs: 60_000, prefix: 'articles-write' });
  const payload = parseJson(createSchema, await request.json());
  const db = getServerSupabase();
  const { data, error } = await db
    .from('articles')
    .insert({ ...payload, status: payload.status ?? 'draft', published_at: payload.status === 'published' ? new Date().toISOString() : null })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return created(data);
});
