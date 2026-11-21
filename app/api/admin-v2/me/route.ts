import { requireV2Api } from '../../../../lib/auth/v2-admin';
import { handleRoute, ok } from '../../../../lib/api/response';
export const dynamic='force-dynamic';
export const GET=handleRoute(async()=>{
  const {actor}=await requireV2Api('articles.read_all');
  return ok({name:actor.name,role:actor.role,permissions:actor.permissions});
});
