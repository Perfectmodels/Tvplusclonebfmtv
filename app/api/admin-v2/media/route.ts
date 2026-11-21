import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { requireV2Api } from '../../../../lib/auth/v2-admin';
import { ApiError, handleRoute, ok, created } from '../../../../lib/api/response';
export const dynamic='force-dynamic';
export const runtime='nodejs';
function asPublic(db:Awaited<ReturnType<typeof requireV2Api>>['db'], item:{
  id:string;bucket:string;path:string;imgbb_url:string|null;
  alt:string;caption:string;credit:string;mime_type:string;size_bytes:number;
  width:number|null;height:number|null;created_at:string;
}) {
  return {...item,url:item.imgbb_url||db.storage.from(item.bucket).getPublicUrl(item.path).data.publicUrl};
}
export const GET=handleRoute(async(request:NextRequest)=>{
  const {db}=await requireV2Api('articles.read_all');
  const params=request.nextUrl.searchParams;
  const page=Math.min(500,Math.max(1,Number(params.get('page'))||1));
  const size=Math.min(60,Math.max(1,Number(params.get('pageSize'))||32));
  const {data,count,error}=await db.from('media').select('id,bucket,path,imgbb_url,alt,caption,credit,mime_type,size_bytes,width,height,created_at',{count:'exact'})
    .order('created_at',{ascending:false}).range((page-1)*size,page*size-1);
  if(error)throw new ApiError('Médiathèque indisponible.',503,'UNAVAILABLE');
  return ok({items:(data??[]).map(item=>asPublic(db,item)),total:count??0,page,pageSize:size});
});
export const POST=handleRoute(async(request:NextRequest)=>{
  const {db,actor}=await requireV2Api('media.upload');
  const form=await request.formData();
  const file=form.get('file');
  const alt=String(form.get('alt')??'').trim().slice(0,240);
  if(!(file instanceof File))throw new ApiError('Fichier manquant.',400);
  const MAX_BYTES = 1024 * 1024;
  const allowed = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'image/avif',
    'image/gif', 'image/tiff', 'image/heic', 'image/heif', 'image/bmp',
  ]);
  if (!allowed.has(file.type)) throw new ApiError(
    'Format non pris en charge. Utilisez JPEG, PNG, WebP, AVIF, GIF, TIFF, HEIC ou BMP.', 400,
  );
  if (!file.size || file.size > MAX_BYTES) throw new ApiError(
    'La photo doit peser au maximum 1 Mo.', 400,
  );
  let processed: Buffer | null = null;
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const source = sharp(bytes, { limitInputPixels: 35_000_000, animated: false, failOn: 'error' });
    const metadata = await source.metadata();
    if (!metadata.format || !['jpeg','png','webp','avif','gif','tiff','heif','bmp'].includes(metadata.format))
      throw new Error('Invalid image');
    // Une conversion WebP 1200×630 allège la photo sans stocker les originaux.
    for (const quality of [82, 70, 58, 45]) {
      const output = await sharp(bytes, { limitInputPixels: 35_000_000, animated: false, failOn: 'error' })
        .rotate().resize(1200,630,{fit:'cover',position:'attention'})
        .webp({quality,effort:4}).toBuffer();
      if (output.length <= MAX_BYTES) { processed = output; break; }
    }
  } catch { throw new ApiError('Image illisible ou format non compatible.',400); }
  if (!processed) throw new ApiError('Image trop volumineuse après optimisation (1 Mo maximum).',400);
  const path='article-covers/'+actor.id+'/'+randomUUID()+'.webp';
  const {error:uploadError}=await db.storage.from('media').upload(path,processed,{contentType:'image/webp',upsert:false,cacheControl:'31536000'});
  if(uploadError)throw new ApiError('Envoi du fichier refusé.',403,'UNAUTHORIZED');
  const {data,error}=await db.from('media').insert({
    bucket:'media',path,mime_type:'image/webp',size_bytes:processed.length,
    width:1200,height:630,alt,uploaded_by:actor.id,
  }).select('id,bucket,path,imgbb_url,alt,caption,credit,mime_type,size_bytes,width,height,created_at').single();
  if(error){
    await db.storage.from('media').remove([path]);
    throw new ApiError('Image envoyée mais impossible à enregistrer dans la médiathèque.',403,'UNAUTHORIZED');
  }
  return created(asPublic(db,data));
});
