import { NextRequest } from 'next/server';
import { requireApiPermission, logAction } from '../../../../lib/auth/api';
import { PERMISSIONS } from '../../../../lib/auth/permissions';
import { getServerSupabase } from '../../../../lib/supabase/server';
import { handleRoute, ok, created, ApiError } from '../../../../lib/api/response';

export const dynamic = 'force-dynamic';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4'];
const MAX_BYTES = 20 * 1024 * 1024;

export const GET = handleRoute(async (request: NextRequest) => {
  await requireApiPermission(PERMISSIONS.MEDIA_UPLOAD);
  const q = (request.nextUrl.searchParams.get('q') ?? '').trim();
  const db = getServerSupabase();
  let query = db.from('media').select('*').order('created_at', { ascending: false }).limit(100);
  if (q) query = query.ilike('file_name', `%${q}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ok({ items: data ?? [], total: data?.length ?? 0 });
});

export const POST = handleRoute(async (request: NextRequest) => {
  const actor = await requireApiPermission(PERMISSIONS.MEDIA_UPLOAD);
  const form = await request.formData();
  const file = form.get('file');

  if (!(file instanceof File)) throw new ApiError('Aucun fichier reçu.', 400);
  if (!ALLOWED.includes(file.type)) throw new ApiError('Format non autorisé. Utilisez JPG, PNG, WebP, GIF ou MP4.', 400);
  if (file.size > MAX_BYTES) throw new ApiError('Le fichier dépasse 20 Mo.', 400);

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120);
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
  const db = getServerSupabase();
  const { error: uploadError } = await db.storage.from('media').upload(path, file, {
    contentType: file.type,
    cacheControl: '3600',
    upsert: false,
  });
  if (uploadError) throw new Error(uploadError.message);

  const publicUrl = db.storage.from('media').getPublicUrl(path).data.publicUrl;
  const { data, error } = await db.from('media').insert({
    file_name: file.name,
    storage_path: path,
    public_url: publicUrl,
    mime_type: file.type,
    size_bytes: file.size,
    uploaded_by: actor.user.id,
  }).select('*').single();
  if (error) throw new Error(error.message);

  await logAction(actor.user, 'media.upload', 'media', data.id, { file_name: file.name });
  return created(data);
});
