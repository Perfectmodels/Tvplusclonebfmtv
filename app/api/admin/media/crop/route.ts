import { NextRequest } from 'next/server';
import { z } from 'zod';
import sharp from 'sharp';
import { requireApiPermission, logAction } from '../../../../../lib/auth/api';
import { PERMISSIONS } from '../../../../../lib/auth/permissions';
import { getServerSupabase } from '../../../../../lib/supabase/server';
import { handleRoute, ok, created, ApiError } from '../../../../../lib/api/response';
import { parseJson } from '../../../../../lib/api/validate';

export const dynamic = 'force-dynamic';

const schema = z.object({
  mediaId: z.string().uuid(),
  crop: z.object({
    x: z.number().min(0),
    y: z.number().min(0),
    width: z.number().min(10),
    height: z.number().min(10),
  }),
  rotation: z.number().int().min(0).max(270).default(0),
  name: z.string().trim().max(120).optional(),
});

export const POST = handleRoute(async (request: NextRequest) => {
  const actor = await requireApiPermission(PERMISSIONS.MEDIA_UPLOAD);
  const { mediaId, crop, rotation, name } = parseJson(schema, await request.json());
  const db = getServerSupabase();

  const { data: media, error: findError } = await db.from('media').select('*').eq('id', mediaId).maybeSingle();
  if (findError || !media) throw new ApiError('Média source introuvable.', 404, 'NOT_FOUND');
  if (!media.mime_type.startsWith('image/')) throw new ApiError('Seules les images peuvent être recadrées.', 400);

  const { data: blob, error: downloadError } = await db.storage.from('media').download(media.storage_path);
  if (downloadError || !blob) throw new Error(downloadError?.message ?? 'Téléchargement impossible.');

  const buffer = Buffer.from(await blob.arrayBuffer());
  const fileName = (name ?? media.file_name).replace(/[^a-zA-Z0-9._-]/g, '-').replace(/\.[^.]+$/, '') + '-1200x630.jpg';
  const path = `crop-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${fileName}`;

  const output = await sharp(buffer)
    .rotate(rotation)
    .extract({
      left: Math.round(crop.x),
      top: Math.round(crop.y),
      width: Math.round(crop.width),
      height: Math.round(crop.height),
    })
    .resize(1200, 630, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 86, mozjpeg: true })
    .toBuffer();

  const { error: uploadError } = await db.storage.from('media').upload(path, output, {
    contentType: 'image/jpeg',
    cacheControl: '3600',
    upsert: false,
  });
  if (uploadError) throw new Error(uploadError.message);

  const publicUrl = db.storage.from('media').getPublicUrl(path).data.publicUrl;
  const { data: saved, error: saveError } = await db.from('media').insert({
    file_name: fileName,
    storage_path: path,
    public_url: publicUrl,
    mime_type: 'image/jpeg',
    size_bytes: output.byteLength,
    width: 1200,
    height: 630,
    uploaded_by: actor.user.id,
  }).select('*').single();
  if (saveError) throw new Error(saveError.message);

  await logAction(actor.user, 'media.crop', 'media', saved.id, { source: media.file_name, output: fileName });
  return created(saved);
});
