import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, handleRoute, ok } from '../../../../../lib/api/response';
import { requireV2AnyApi } from '../../../../../lib/auth/v2-admin';
import {
  deleteSproutVideo,
  getSproutVideo,
  updateSproutVideo,
} from '../../../../../lib/video/sproutvideo';
import { sproutPermissions, sproutVideoKinds } from '../../../../../lib/video/sproutvideo-types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Context = { params: Promise<{ id: string }> };
type AdminDb = Awaited<ReturnType<typeof requireV2AnyApi>>['db'];

const idSchema = z.string().regex(/^[a-f0-9]{6,64}$/i, 'Identifiant de vidéo invalide.');
const kindSchema = z.enum(sproutVideoKinds).optional();

const patchSchema = z.object({
  kind: kindSchema,
  title: z.string().trim().min(1).max(200).optional(),
  posterframe_number: z.number().int().min(0).max(3).optional(),
}).refine(value => value.title !== undefined || value.posterframe_number !== undefined, 'Aucune modification demandée.');

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  return (!origin || origin === request.nextUrl.origin) && request.headers.get('sec-fetch-site') !== 'cross-site';
}

function queryKind(request: NextRequest) {
  return kindSchema.safeParse(request.nextUrl.searchParams.get('kind') ?? undefined);
}

type Usage = { count: number; unknown: boolean };

/** Compte les contenus du site qui utilisent encore cette vidéo. */
async function usageCount(db: AdminDb, id: string): Promise<Usage> {
  const pattern = '%/embed/' + id + '/%';
  const results = await Promise.allSettled([
    db.from('episodes').select('id', { count: 'exact', head: true }).like('source_url', pattern),
    db.from('editorial_media').select('id', { count: 'exact', head: true }).like('source_url', pattern),
    db.from('articles').select('id', { count: 'exact', head: true }).like('video_url', pattern),
  ]);
  let count = 0;
  let unknown = false;
  for (const result of results) {
    if (result.status === 'fulfilled' && !result.value.error) count += result.value.count ?? 0;
    else unknown = true;
  }
  return { count, unknown };
}

export const GET = handleRoute(async (request: NextRequest, { params }: Context) => {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) throw new ApiError('Identifiant de vidéo invalide.', 400, 'BAD_REQUEST');
  const kind = queryKind(request);
  if (!kind.success) throw new ApiError('Format de vidéo invalide.', 400, 'BAD_REQUEST');
  await requireV2AnyApi(sproutPermissions(kind.data));
  return ok(await getSproutVideo(id));
});

export const PATCH = handleRoute(async (request: NextRequest, { params }: Context) => {
  if (!sameOrigin(request)) throw new ApiError('Requête refusée.', 403, 'UNAUTHORIZED');
  const { id } = await params;
  if (!idSchema.safeParse(id).success) throw new ApiError('Identifiant de vidéo invalide.', 400, 'BAD_REQUEST');
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError(parsed.error.issues[0]?.message || 'Modification invalide.', 400, 'BAD_REQUEST');
  await requireV2AnyApi(sproutPermissions(parsed.data.kind));
  return ok(await updateSproutVideo(id, {
    ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
    ...(parsed.data.posterframe_number !== undefined ? { posterframe_number: parsed.data.posterframe_number } : {}),
  }));
});

export const DELETE = handleRoute(async (request: NextRequest, { params }: Context) => {
  if (!sameOrigin(request)) throw new ApiError('Requête refusée.', 403, 'UNAUTHORIZED');
  const { id } = await params;
  if (!idSchema.safeParse(id).success) throw new ApiError('Identifiant de vidéo invalide.', 400, 'BAD_REQUEST');
  const kind = queryKind(request);
  if (!kind.success) throw new ApiError('Format de vidéo invalide.', 400, 'BAD_REQUEST');
  const { db } = await requireV2AnyApi(sproutPermissions(kind.data));
  const force = request.nextUrl.searchParams.get('force') === '1';
  const usage = await usageCount(db, id);
  if (!force && (usage.count > 0 || usage.unknown)) {
    throw new ApiError(
      usage.count > 0
        ? 'Cette vidéo est utilisée par ' + usage.count + ' contenu(s) du site. Confirmez la suppression forcée.'
        : 'Impossible de vérifier si cette vidéo est utilisée par le site. Confirmez la suppression forcée.',
      409,
      'CONFLICT',
      { usage: usage.count, unknown: usage.unknown },
    );
  }
  await deleteSproutVideo(id);
  return ok({ deleted: true });
});
