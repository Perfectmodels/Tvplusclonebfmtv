import { handleRoute, ok, ApiError } from '../../../../lib/api/response';
import { requireV2Api } from '../../../../lib/auth/v2-admin';
import { newsroom, usesLwsCatalog } from '../../../../lib/admin-v2/lws';
export const dynamic='force-dynamic';
export const GET=handleRoute(async()=>{
  const {actor,db}=await requireV2Api('articles.read_all');
  if(usesLwsCatalog())return ok(await newsroom(actor,'dashboard'));
  const [published,drafts,review,approved,scheduled,media,categories,recent]=await Promise.all([
    db.from('articles').select('id',{head:true,count:'exact'}).eq('status','published'),
    db.from('articles').select('id',{head:true,count:'exact'}).eq('status','draft'),
    db.from('articles').select('id',{head:true,count:'exact'}).eq('status','in_review'),
    db.from('articles').select('id',{head:true,count:'exact'}).eq('status','approved'),
    db.from('articles').select('id',{head:true,count:'exact'}).eq('status','scheduled'),
    db.from('media').select('id',{head:true,count:'exact'}),
    db.from('categories').select('id',{head:true,count:'exact'}),
    db.from('articles').select('id,title,slug,status,updated_at').order('updated_at',{ascending:false}).limit(7),
  ]);
  if([published,drafts,review,approved,scheduled,media,categories,recent].some(x=>x.error))
    throw new ApiError('Certaines statistiques sont indisponibles.',503,'UNAVAILABLE');
  return ok({published:published.count??0,drafts:drafts.count??0,review:review.count??0,
    approved:approved.count??0,scheduled:scheduled.count??0,media:media.count??0,
    categories:categories.count??0,recent:recent.data??[]});
});
