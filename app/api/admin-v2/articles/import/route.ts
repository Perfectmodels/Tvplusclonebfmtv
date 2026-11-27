import {NextRequest} from 'next/server';
import {z} from 'zod';
import {requireV2Api} from '../../../../../lib/auth/v2-admin';
import {ApiError,created,ok,handleRoute} from '../../../../../lib/api/response';
import {cleanArticlePayload,invalidatePublicArticle} from '../../../../../lib/admin-v2/article-write';
import {rateLimit} from '../../../../../lib/api/rate-limit';
export const dynamic='force-dynamic';

const schema=z.object({
 source_post_id:z.number().int().positive().max(9999999),
 source_author_name:z.string().trim().min(2).max(160),
 author_id:z.string().uuid(),
 source_category_label:z.string().trim().min(1).max(160),
 source_cover_url:z.string().max(2048).url().refine(v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}}),
 source_published_at:z.string().datetime({offset:true}),
 article:z.unknown(),
});
const normal=(s:string)=>{const v=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();return /^(?:pamphil|panfil)(?: ebo)?$|^ebo$|^ebo (?:pamphil|panfil)$/.test(v)?'panfil ebo':v;};
function textLength(node:unknown):number{if(!node||typeof node!=='object')return 0;const n=node as {text?:unknown;content?:unknown[]};return (typeof n.text==='string'?n.text.trim().length:0)+(Array.isArray(n.content)?n.content.reduce<number>((total,item)=>total+textLength(item),0):0);}

// Existing authenticated editorial review permission + RLS. No privileged bypass.
export const POST=handleRoute(async(req:NextRequest)=>{
 if(req.headers.get('origin')!==req.nextUrl.origin)throw new ApiError('Origine refusée.',403,'UNAUTHORIZED');
 const {actor,db}=await requireV2Api('articles.review');
 rateLimit(req,{prefix:'editorial-import',subject:actor.id,limit:60,windowMs:60000});
 const parsed=schema.safeParse(await req.json());
 if(!parsed.success)throw new ApiError('Les métadonnées originales sont incomplètes.',400);
 const p=parsed.data;
 const {data:existing,error:readError}=await db.from('articles').select('id,slug,short_code,status').eq('source_post_id',p.source_post_id).maybeSingle();
 if(readError)throw new ApiError('Impossible de vérifier les doublons.',503,'UNAVAILABLE');
 if(existing)return ok({imported:false,reason:'source_exists',article:existing});
 if(Date.parse(p.source_published_at)>Date.now())throw new ApiError('La publication source doit avoir une date passée.',400);
 const article=cleanArticlePayload(p.article);
 if(textLength(article.content_json)<80||!article.excerpt.trim())throw new ApiError('Le contenu complet est requis.',400);
 const [{data:author,error:authorError},{data:category,error:categoryError}]=await Promise.all([
  db.from('profiles').select('id,full_name,role,is_active').eq('id',p.author_id).maybeSingle(),
  db.from('categories').select('id').eq('id',article.category_id).maybeSingle()
 ]);
 if(authorError||categoryError)throw new ApiError('Impossible de vérifier les références.',503,'UNAVAILABLE');
 if(!author?.is_active||author.role==='reader'||!author.full_name||normal(author.full_name)!==normal(p.source_author_name))throw new ApiError('Signature originale non associée à un rédacteur actif : import suspendu.',409,'CONFLICT');
 if(!category)throw new ApiError('Rubrique source introuvable.',400);
 const {data:duplicate,error:dupError}=await db.from('articles').select('id').eq('slug',article.slug).maybeSingle();
 if(dupError)throw new ApiError('Impossible de vérifier le lien.',503,'UNAVAILABLE');
 if(duplicate)throw new ApiError('Un article possède déjà ce lien. Vérifiez le doublon.',409,'CONFLICT');
 const {data,error}=await db.from('articles').insert({...article,author_id:p.author_id,source_post_id:p.source_post_id,source_author_name:p.source_author_name,source_cover_url:p.source_cover_url,source_category_label:p.source_category_label,source_published_at:p.source_published_at,published_at:p.source_published_at,status:'published',reviewed_by:actor.id,reviewed_at:new Date().toISOString()}).select('id,slug,short_code,status,published_at').single();
 if(error?.code==='23505')throw new ApiError('Un article correspondant existe déjà. Aucun contenu écrasé.',409,'CONFLICT');
 if(error||!data)throw new ApiError('Import refusé par la base ou les permissions.',503,'UNAVAILABLE');
 invalidatePublicArticle(data.slug);
 return created({imported:true,article:data,url:'/a/'+data.short_code});
});
