import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError, handleRoute, ok } from '../../../../../lib/api/response';
import { rateLimit } from '../../../../../lib/api/rate-limit';
import { requireV2AnyApi } from '../../../../../lib/auth/v2-admin';
import { createSproutUploadToken } from '../../../../../lib/video/sproutvideo';
import { sproutPermissions, sproutVideoKinds } from '../../../../../lib/video/sproutvideo-types';

export const runtime = 'nodejs';

const bodySchema = z.object({
  kind: z.enum(sproutVideoKinds).optional(),
});

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  return (!origin || origin === request.nextUrl.origin) && request.headers.get('sec-fetch-site') !== 'cross-site';
}

export const POST = handleRoute(async (request: NextRequest) => {
  if (!sameOrigin(request)) throw new ApiError('Requête refusée.', 403, 'UNAUTHORIZED');
  rateLimit(request, { prefix: 'sprout-upload-token', limit: 12, windowMs: 60_000 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError('Demande de téléversement invalide.', 400, 'BAD_REQUEST');
  await requireV2AnyApi(sproutPermissions(parsed.data.kind));
  return ok(await createSproutUploadToken());
});
