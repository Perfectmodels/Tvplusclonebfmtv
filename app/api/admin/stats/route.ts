import { NextRequest } from 'next/server';
import { requireApiPermission } from '../../../../lib/auth/api';
import { PERMISSIONS } from '../../../../lib/auth/permissions';
import { getDashboardStats } from '../../../../lib/db/repository';
import { handleRoute, ok } from '../../../../lib/api/response';

export const dynamic = 'force-dynamic';

export const GET = handleRoute(async (_request: NextRequest) => {
  await requireApiPermission(PERMISSIONS.ARTICLES_READ);
  return ok(await getDashboardStats());
});
