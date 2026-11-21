import { requireV2Api } from '../../../../../lib/auth/v2-admin';
import { handleRoute, ok, ApiError } from '../../../../../lib/api/response';
export const dynamic='force-dynamic';
export const GET=handleRoute(async()=>{
  const {db}=await requireV2Api('articles.read_all');
  const {data,error}=await db.from('profiles').select('id,full_name').order('full_name',{ascending:true});
  if(error)throw new ApiError('Impossible de charger les auteurs.',503,'UNAVAILABLE');
  return ok({items:(data??[]).map(p=>({id:p.id,name:p.full_name||'Rédaction TV+'}))});
});
