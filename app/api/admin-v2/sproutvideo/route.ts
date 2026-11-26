import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, handleRoute, ok } from '../../../../lib/api/response';
import { requireV2AnyApi } from '../../../../lib/auth/v2-admin';
import { listSproutVideos } from '../../../../lib/video/sproutvideo';
import { sproutPermissions, sproutVideoKinds } from '../../../../lib/video/sproutvideo-types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const querySchema = z.object({
  kind: z.enum(sproutVideoKinds).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(12),
});

export const GET = handleRoute(async (request: NextRequest) => {
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) throw new ApiError('Filtres de la vidéothèque invalides.', 400, 'BAD_REQUEST');
  const { kind, page, pageSize } = parsed.data;
  await requireV2AnyApi(sproutPermissions(kind));
  return ok(await listSproutVideos(page, pageSize));
});
