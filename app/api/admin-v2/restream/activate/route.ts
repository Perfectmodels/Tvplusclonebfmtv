import {newsroom} from '../../../../../lib/admin-v2/lws';
import { NextRequest } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { requireV2Api } from '../../../../../lib/auth/v2-admin';
import { ApiError, handleRoute, ok } from '../../../../../lib/api/response';
import { discoverRestreamSources } from '../../../../../lib/restream/discovery';
import { getSavedConnection, getValidToken } from '../../../../../lib/restream/oauth';
import { resolveLivePlayback } from '../../../../../lib/video/live-platforms';

export const dynamic='force-dynamic';
const bodySchema=z.object({mode:z.enum(['restream','youtube'])});

/** Bind public TV+ playback to an actual, verified external player from the
 * authenticated Restream account. No ingest keys or private video URLs. */
export const POST=handleRoute(async(request:NextRequest)=>{
 const {actor}=await requireV2Api('schedule.manage');
 const origin=request.headers.get('origin');
 if (!origin || origin!==request.nextUrl.origin) {
  throw new ApiError('Origine de la requête refusée.',403,'UNAUTHORIZED');
 }
 let payload:unknown;
 try {payload=await request.json();} catch {throw new ApiError('Requête invalide.',400,'BAD_REQUEST');}
 const parsed=bodySchema.safeParse(payload);
 if(!parsed.success)throw new ApiError('Mode de lecteur inconnu.',400,'BAD_REQUEST');
 const connected=await getSavedConnection(actor);
 if(!connected)throw new ApiError('Connectez d’abord votre compte Restream.',409,'CONFLICT');
 const accessToken=await getValidToken(actor,connected);
 const discovery=await discoverRestreamSources(accessToken);
 const platform=parsed.data.mode;
 const playbackUrl=platform==='restream'?discovery.embedPlayerUrl:discovery.youtubeLiveUrl;
 const player=resolveLivePlayback(platform,playbackUrl,request.nextUrl.hostname);
 if(!player.embedUrl) {
  throw new ApiError(
   platform==='youtube'
    ? 'Aucun YouTube Live public n’a été détecté dans Restream. Activez YouTube comme destination, actualisez, ou renseignez le lien du live.'
    : 'Aucun lecteur Restream Embed Player n’a été détecté dans le compte.',
   409,'CONFLICT'
  );
 }
 const title='TV+ Afrique en direct';
 await newsroom(actor,'live.save',{data:{title,description:'Direct TV+ Afrique diffusé via Restream',standby_message:'Le direct reprendra prochainement.',player_platform:platform,playback_url:playbackUrl,hls_url:'',enabled:true,starts_at:null,ends_at:null}});
 revalidateTag('tvplus-public-live-settings');
 revalidatePath('/');
 revalidatePath('/direct');
 return ok({player_platform:platform,enabled:true,description:'Diffusion produite dans Restream et affichée via un lecteur externe autorisé.'});
});
