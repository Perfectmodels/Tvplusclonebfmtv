import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireV2Api } from '../../../../../lib/auth/v2-admin';
import { handleRoute, created, ApiError } from '../../../../../lib/api/response';
import { parseJson, emailSchema } from '../../../../../lib/api/validate';
import { newsroom, usesLwsCatalog } from '../../../../../lib/admin-v2/lws';
import { getAdminSupabase } from '../../../../../lib/supabase/server';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(200).regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre.'),
  fullName: z.string().trim().min(2).max(100).optional(),
  role: z.string().regex(/^[a-z_]{2,50}$/).default('reader'),
});

// Supabase Auth reste le fournisseur d'identité ; seul le profil est enregistré dans la V3.
export const POST = handleRoute(async (request: NextRequest) => {
  const { actor } = await requireV2Api('users.manage');
  const payload = parseJson(schema, await request.json());
  const admin = getAdminSupabase();
  const { data: list } = await admin.auth.admin.listUsers();
  if (list?.users.some((user) => user.email === payload.email)) {
    throw new ApiError('Un compte existe déjà avec cette adresse e-mail.', 409, 'CONFLICT');
  }
  const { data, error } = await admin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: { full_name: payload.fullName ?? '' },
  });
  if (error || !data.user) throw new ApiError('Création du compte refusée.', 403, 'UNAUTHORIZED');

  if (usesLwsCatalog()) {
    try {
      const profile = await newsroom(actor, 'users.create', { data: {
        id: data.user.id, email: payload.email, full_name: payload.fullName ?? null,
        role: payload.role, is_active: true,
      } });
      return created(profile);
    } catch (profileError) {
      await admin.auth.admin.deleteUser(data.user.id).catch(() => undefined);
      throw profileError;
    }
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: data.user.id, email: payload.email, full_name: payload.fullName ?? null, role: payload.role,
  });
  if (profileError) throw new ApiError('Compte créé mais profil inaccessible.', 403, 'UNAUTHORIZED');
  return created({ id: data.user.id, email: payload.email, role: payload.role });
});
