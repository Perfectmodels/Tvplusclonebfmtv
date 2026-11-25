import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireV2Api } from '../../../../../lib/auth/v2-admin';
import { handleRoute, created, ApiError } from '../../../../../lib/api/response';
import { parseJson, emailSchema } from '../../../../../lib/api/validate';
import { newsroom, usesLwsCatalog } from '../../../../../lib/admin-v2/lws';
import { hashPassword } from '../../../../../lib/auth/password';

export const dynamic = 'force-dynamic';

const passwordSchema = z.string().min(8).max(200).regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre.');
const schema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(2).max(120).optional(),
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  photoUrl: z.string().trim().max(1300).nullable().optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  bio: z.string().trim().max(2000).nullable().optional(),
  role: z.string().regex(/^[a-z_]{2,50}$/).default('reader'),
});

export const POST = handleRoute(async (request: NextRequest) => {
  if (process.env.LWS_EDITORIAL_API_URL) {
    const { actor } = await requireV2Api('users.manage');
    const payload = parseJson(schema, await request.json());
    const profile = await newsroom(actor, 'profile.signup', { data: {
      email: payload.email,
      full_name: (payload.fullName ?? [payload.firstName, payload.lastName].filter(Boolean).join(' ')) || null,
      first_name: payload.firstName ?? null, last_name: payload.lastName ?? null,
      photo_url: payload.photoUrl ?? null, birth_date: payload.birthDate ?? null,
      phone: payload.phone ?? null, city: payload.city ?? null, bio: payload.bio ?? null,
      role: payload.role, password_hash: hashPassword(payload.password), is_temporary: false,
    } });
    return created(profile);
  }
  throw new ApiError('Création disponible uniquement avec l’API MySQL.', 410, 'UNAVAILABLE');
});
