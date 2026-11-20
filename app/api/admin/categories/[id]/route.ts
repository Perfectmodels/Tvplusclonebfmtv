import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiPermission, logAction } from '../../../../../lib/auth/api';
import { PERMISSIONS } from '../../../../../lib/auth/permissions';
import { getServerSupabase } from '../../../../../lib/supabase/server';
import { handleRoute, ok, ApiError } from '../../../../../lib/api/response';
import { parseJson } from '../../../../../lib/api/validate';

export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };

const schema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(300).optional().nullable(),
}).refine((v) => Object.keys(v).length > 0, { message: 'Aucune donnée à mettre à jour.' });

export const PATCH = handleRoute(async (request: NextRequest, { params }: Context) => {
  const actor = await requireApiPermission(PERMISSIONS.CATEGORIES_MANAGE);
  const { id } = await params;
  const payload = parseJson(schema, await request.json());
  const db = getServerSupabase();
  const { data, error } = await db.from('categories').update(payload).eq('id', id).select('*').maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new ApiError('Rubrique introuvable.', 404, 'NOT_FOUND');
  await logAction(actor.user, 'category.update', 'categories', id, { name: data.name });
  return ok(data);
});

export const DELETE = handleRoute(async (_request: NextRequest, { params }: Context) => {
  const actor = await requireApiPermission(PERMISSIONS.CATEGORIES_MANAGE);
  const { id } = await params;
  const db = getServerSupabase();
  const { data: category } = await db.from('categories').select('slug, name').eq('id', id).maybeSingle();
  if (!category) throw new ApiError('Rubrique introuvable.', 404, 'NOT_FOUND');
  const { count } = await db.from('articles').select('*', { count: 'exact', head: true }).eq('category_slug', category.slug);
  if (count && count > 0) throw new ApiError(`Impossible de supprimer « ${category.name} » : ${count} article(s) y sont associés.`, 409, 'CONFLICT');
  const { error } = await db.from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
  await logAction(actor.user, 'category.delete', 'categories', id, { name: category.name });
  return ok({ deleted: id });
});
