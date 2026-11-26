import { NextRequest } from 'next/server';
import { z } from 'zod';
import { getArticleBySlug } from '../../../../lib/db/repository';
import { getServerSupabase } from '../../../../lib/supabase/server';
import { requireAdmin } from '../../../../lib/api/auth';
import { handleRoute, ok, fail } from '../../../../lib/api/response';
import { parseJson } from '../../../../lib/api/validate';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ slug: string }> };

const updateSchema = z.object({
  title: z.string().trim().min(5).max(250).optional(),
  summary: z.string().trim().min(10).max(600).optional(),
  body: z.string().optional(),
  image_url: z.string().url().optional().nullable(),
  author: z.string().trim().max(120).optional(),
  kind: z.enum(['live', 'alert', 'video', 'direct']).optional().nullable(),
  featured: z.boolean().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
}).refine((value) => Object.keys(value).length > 0, { message: 'Aucune donnée à mettre à jour.' });

export const GET = handleRoute(async (_request: NextRequest, { params }: Context) => {
  const { slug } = await params;
  const { item, source } = await getArticleBySlug(slug);
  if (!item) return fail('Article introuvable.', 404, 'NOT_FOUND');
  return ok({ ...item, source });
});

export const PATCH = handleRoute(async (request: NextRequest, { params }: Context) => {
  requireAdmin(request);
  const { slug } = await params;
  const payload = parseJson(updateSchema, await request.json());
  const db = getServerSupabase();
  const { data, error } = await db
    .from('articles')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('slug', slug)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return fail('Article introuvable.', 404, 'NOT_FOUND');
  return ok(data);
});

export const DELETE = handleRoute(async (request: NextRequest, { params }: Context) => {
  requireAdmin(request);
  const { slug } = await params;
  const db = getServerSupabase();
  const { error } = await db.from('articles').delete().eq('slug', slug);
  if (error) throw new Error(error.message);
  return ok({ deleted: slug });
});
