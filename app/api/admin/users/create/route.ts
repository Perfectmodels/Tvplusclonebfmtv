import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireApiPermission, logAction } from '../../../../../lib/auth/api';
import { PERMISSIONS } from '../../../../../lib/auth/permissions';
import { getServerSupabase } from '../../../../../lib/supabase/server';
import { handleRoute, ok, created, ApiError } from '../../../../../lib/api/response';
import { parseJson, emailSchema } from '../../../../../lib/api/validate';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(200).regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre.'),
  fullName: z.string().trim().min(2).max(100).optional(),
  role: z.enum(['reader', 'admin']).default('reader'),
});

export const POST = handleRoute(async (request: NextRequest) => {
  const actor = await requireApiPermission(PERMISSIONS.USERS_MANAGE);
  const payload = parseJson(schema, await request.json());
  const db = getServerSupabase();

  const { data: list } = await db.auth.admin.listUsers();
  if (list?.users.some((u) => u.email === payload.email)) {
    throw new ApiError('Un compte existe déjà avec cette adresse e-mail.', 409, 'CONFLICT');
  }

  const { data, error } = await db.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: { full_name: payload.fullName ?? '' },
  });
  if (error) throw new Error(error.message);

  const { error: profileError } = await db.from('profiles').upsert({
    id: data.user.id,
    email: payload.email,
    full_name: payload.fullName ?? null,
    role: payload.role,
  });
  if (profileError) throw new Error(profileError.message);

  await logAction(actor.user, 'user.create', 'profiles', data.user.id, { email: payload.email, role: payload.role });
  return created({ id: data.user.id, email: payload.email, role: payload.role });
});
