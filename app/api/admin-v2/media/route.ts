import { NextRequest } from 'next/server';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { del, put } from '@vercel/blob';
import { BLOB_MEDIA_BUCKET, getExternalMediaUrl } from '../../../../lib/media-url';
import { requireV2Api } from '../../../../lib/auth/v2-admin';
import { ApiError, handleRoute, ok, created } from '../../../../lib/api/response';
import { newsroom, usesLwsCatalog } from '../../../../lib/admin-v2/lws';
export const dynamic='force-dynamic';
export const runtime='nodejs';

type MysqlMedia = {
  id:string; bucket:string; path:string; imgbb_url:string|null;
  alt:string; caption:string; credit:string; mime_type:string; size_bytes:number;
  width:number|null; height:number|null; created_at:string|null; url:string;
};

function asMysqlPublic(item: MysqlMedia) {
  return { ...item, url: item.url || item.path };
}

function asPublic(db:Awaited<ReturnType<typeof requireV2Api>>['db'], item:{
  id:string;bucket:string;path:string;imgbb_url:string|null;
  alt:string;caption:string;credit:string;mime_type:string;size_bytes:number;
  width:number|null;height:number|null;created_at:string;
}) {
  return {...item,url:getExternalMediaUrl(item)||db.storage.from(item.bucket).getPublicUrl(item.path).data.publicUrl};
}

export const GET=handleRoute(async(request:NextRequest)=>{
  const {actor,db}=await requireV2Api('articles.read_all');
  const params=request.nextUrl.searchParams;
  const page=Math.min(500,Math.max(1,Number(params.get('page'))||1));
  const size=Math.min(60,Math.max(1,Number(params.get('pageSize'))||32));
  const mediaId = params.get('id');
  if (usesLwsCatalog()) {
    const result = await newsroom<{items:MysqlMedia[];total:number;page:number;pageSize:number}>(actor,'media.list',{
      data:{page,pageSize:size,id:mediaId||null},
    });
    return ok({items:result.items.map(asMysqlPublic),total:result.total,page:result.page,pageSize:result.pageSize});
  }
  if (mediaId) {
    if (!/^[0-9a-f-]{36}$/i.test(mediaId)) throw new ApiError('Identifiant de média invalide.',400);
    const {data,error}=await db.from('media')
      .select('id,bucket,path,imgbb_url,alt,caption,credit,mime_type,size_bytes,width,height,created_at')
      .eq('id',mediaId).maybeSingle();
    if(error)throw new ApiError('Lecture du média impossible.',503,'UNAVAILABLE');
    return ok({items:data?[asPublic(db,data)]:[],total:data?1:0,page:1,pageSize:1});
  }
  const {data,count,error}=await db.from('media').select('id,bucket,path,imgbb_url,alt,caption,credit,mime_type,size_bytes,width,height,created_at',{count:'exact'})
    .order('created_at',{ascending:false}).range((page-1)*size,page*size-1);
  if(error)throw new ApiError('Médiathèque indisponible.',503,'UNAVAILABLE');
  return ok({items:(data??[]).map(item=>asPublic(db,item)),total:count??0,page,pageSize:size});
});

export const POST=handleRoute(async(request:NextRequest)=>{
  const {actor,db}=await requireV2Api('media.upload');
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
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    throw new ApiError('Stockage des médias indisponible.', 503, 'UNAVAILABLE');
  }

  const filename = randomUUID() + '.webp';
  const bucket = BLOB_MEDIA_BUCKET;
  let path = 'article-covers/' + actor.id + '/' + filename;
  if (blobToken) {
    try {
      const blob = await put('article-covers/' + filename, processed, {
        access: 'public',
        token: blobToken,
        contentType: 'image/webp',
        cacheControlMaxAge: 31_536_000,
      });
      path = blob.url;
    } catch {
      throw new ApiError('Envoi vers le stockage des médias impossible.', 503, 'UNAVAILABLE');
    }
  }
  const mediaUrl = path;
  if (usesLwsCatalog()) {
    try {
      const item = await newsroom<MysqlMedia>(actor,'media.create',{data:{
        original_path:path, media_url:mediaUrl, alt_text:alt,
        caption:'', credit:'', mime_type:'image/webp',
        size_bytes:processed.length, width_px:1200, height_px:630,
      }});
      return created(asMysqlPublic(item));
    } catch (error) {
      try {
        if (blobToken) await del(path, { token: blobToken });

      } catch {
        console.error('Impossible de nettoyer un média après un échec d’enregistrement.');
      }
      throw error;
    }
  }
  const {data,error}=await db.from('media').insert({
    bucket,path,mime_type:'image/webp',size_bytes:processed.length,
    width:1200,height:630,alt,uploaded_by:actor.id,
  }).select('id,bucket,path,imgbb_url,alt,caption,credit,mime_type,size_bytes,width,height,created_at').single();
  if(error){
    try {
      if (blobToken) await del(path, { token: blobToken });

    } catch {
      console.error('Impossible de nettoyer un média après un échec d’enregistrement.');
    }
    throw new ApiError('Image envoyée mais impossible à enregistrer dans la médiathèque.',403,'UNAUTHORIZED');
  }
  return created(asPublic(db,data));
});
