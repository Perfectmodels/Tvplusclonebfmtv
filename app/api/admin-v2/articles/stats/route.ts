import { requireV2Api } from '../../../../../lib/auth/v2-admin';
import { handleRoute, ok, ApiError } from '../../../../../lib/api/response';
import { newsroom, usesLwsCatalog } from '../../../../../lib/admin-v2/lws';
export const dynamic = 'force-dynamic';
const states = ['published','draft','in_review','approved','scheduled','inactive','archived'] as const;
export const GET = handleRoute(async () => {
  const {actor,db} = await requireV2Api('articles.read_all');
  if (usesLwsCatalog()) return ok(await newsroom(actor,'stats'));
  const [totalResult,...counts] = await Promise.all([
    db.from('articles').select('id',{count:'exact',head:true}),
    ...states.map(status => db.from('articles').select('id',{count:'exact',head:true}).eq('status',status)),
  ]);
  if (totalResult.error || counts.some(result => result.error))
    throw new ApiError('Impossible de charger les indicateurs.',503,'UNAVAILABLE');
  return ok({total:totalResult.count??0,counts:Object.fromEntries(states.map((status,i)=>[status,counts[i].count??0]))});
});
