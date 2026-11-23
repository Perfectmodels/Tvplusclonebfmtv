import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireV2Api } from '../../../../../lib/auth/v2-admin';
import { ApiError, handleRoute, ok } from '../../../../../lib/api/response';
import { discoverRestreamSources } from '../../../../../lib/restream/discovery';
import { getSavedConnection, getValidToken } from '../../../../../lib/restream/oauth';
import { resolveLivePlayback } from '../../../../../lib/video/live-platforms';

export const dynamic='force-dynamic';
const bodySchema=z.object({mode:z.literal('restream')});

/** Bind public TV+ playback to an actual, verified external player from the
 * authenticated Restream account. No ingest keys or private video URLs. */
export const POST=handleRoute(async(request:NextRequest)=>{
 const {db}=await requireV2Api('schedule.manage');
 const origin=request.headers.get('origin');
 if (!origin || origin!==request.nextUrl.origin) {
  throw new ApiError('Origine de la requête refusée.',403,'UNAUTHORIZED');
 }
 let payload:unknown;
 try {payload=await request.json();} catch {throw new ApiError('Requête invalide.',400,'BAD_REQUEST');}
 const parsed=bodySchema.safeParse(payload);
 if(!parsed.success)throw new ApiError('Mode de lecteur inconnu.',400,'BAD_REQUEST');
 const connected=await getSavedConnection(db);
 if(!connected)throw new ApiError('Connectez d’abord votre compte Restream.',409,'CONFLICT');
 const accessToken=await getValidToken(db,connected);
 const discovery=await discoverRestreamSources(accessToken);
 const playbackUrl=discovery.embedPlayerUrl;
 const platform='restream';
 const player=resolveLivePlayback(platform,playbackUrl,request.nextUrl.hostname);
 if(!player.embedUrl) {
  throw new ApiError(
   'Aucun lecteur Restream intégrable valide n’a été détecté. Ajoutez et activez « Embed Player » dans les chaînes de votre compte Restream, ou copiez son code d’intégration depuis Restream.',
   409,'CONFLICT'
  );
 }
 const title='TV+ Afrique en direct';
 const {data,error}=await db.from('site_live_settings').update({
  title,description:'Le direct de TV+ Afrique',
  player_platform:platform,playback_url:playbackUrl,
  hls_url:'',enabled:true,starts_at:null,ends_at:null,
  updated_at:new Date().toISOString(),
 }).eq('id',1).select('id,title,player_platform,playback_url,enabled').maybeSingle();
 if(error||!data)throw new ApiError('Impossible de publier le lecteur sur le site. Vérifiez les autorisations de la régie.',503,'UNAVAILABLE');
 revalidatePath('/');
 revalidatePath('/direct');
 return ok({player_platform:platform,enabled:true,description:'La diffusion publique utilise le lecteur externe de Restream.'});
});
