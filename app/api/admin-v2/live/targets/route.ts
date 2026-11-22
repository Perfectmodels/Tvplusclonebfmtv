
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { requireV2Api } from '../../../../../lib/auth/v2-admin';
import { getAdminSupabase } from '../../../../../lib/supabase/server';
import { isSafePublicWatchUrl,isValidIngestEndpoint } from '../../../../../lib/video/live-platforms';
import { ApiError,created,handleRoute,ok } from '../../../../../lib/api/response';

export const dynamic='force-dynamic';

const profileSchema=z.object({
 id:z.string().uuid().optional(),
 name:z.string().trim().min(2).max(120),
 provider:z.string().trim().regex(/^[a-z0-9-]{2,50}$/),
 direction:z.enum(['source','destination']).default('source'),
 protocol:z.enum(['rtmps','rtmp','srt','whip','platform']).default('rtmps'),
 watch_url:z.string().trim().max(1400).default('').refine(isSafePublicWatchUrl,'Utilisez uniquement un lien public de visionnage HTTPS, jamais une adresse WHIP/RTMP.'),
 enabled:z.boolean().default(false),
 position:z.number().int().min(0).max(999).default(0),
 notes:z.string().trim().max(1000).default(''),
 endpoint:z.string().trim().max(2500).default('').refine(v=>!v||!/\s/.test(v),'Adresse invalide'),
 stream_key:z.string().trim().max(2500).default(''),
 clear_endpoint:z.boolean().default(false),
 clear_key:z.boolean().default(false),
}).superRefine((v,ctx)=>{
 if(v.endpoint&&!isValidIngestEndpoint(v.protocol,v.endpoint)){
  ctx.addIssue({code:'custom',path:['endpoint'],message:'Le protocole de l’adresse ne correspond pas au mode choisi.'});
 }
 if(v.clear_endpoint&&v.endpoint)ctx.addIssue({code:'custom',path:['endpoint'],message:'Choisissez supprimer OU remplacer le serveur.'});
 if(v.clear_key&&v.stream_key)ctx.addIssue({code:'custom',path:['stream_key'],message:'Choisissez supprimer OU remplacer la clé.'});
});

const columns='id,name,provider,direction,protocol,watch_url,enabled,position,notes,endpoint_secret_id,stream_key_secret_id,updated_at';

const publicRow=(r:Record<string,unknown>)=>({
 id:r.id,name:r.name,provider:r.provider,direction:r.direction,protocol:r.protocol,
 watch_url:r.watch_url,enabled:r.enabled,position:r.position,notes:r.notes,
 has_endpoint:Boolean(r.endpoint_secret_id),has_key:Boolean(r.stream_key_secret_id),updated_at:r.updated_at,
});

/** La permission est vérifiée via la session ; le rôle service n'est utilisé qu'après. */
export const GET=handleRoute(async()=>{
 await requireV2Api('schedule.manage');
 const {data,error}=await getAdminSupabase().from('live_stream_targets').select(columns).order('position').order('created_at');
 if(error)throw new ApiError('Configurations de diffusion indisponibles.',503,'UNAVAILABLE');
 return ok({items:(data??[]).map(publicRow)});
});

async function save(request:NextRequest,isUpdate:boolean) {
 await requireV2Api('schedule.manage');
 let input:unknown;
 try {input=await request.json();}catch{throw new ApiError('JSON invalide.',400,'BAD_REQUEST');}
 const p=profileSchema.safeParse(input);
 if(!p.success)throw new ApiError('Paramètres de diffusion invalides.',400,'BAD_REQUEST',p.error.flatten());
 if(isUpdate&&!p.data.id)throw new ApiError('Identifiant requis.',400,'BAD_REQUEST');
 if(!isUpdate&&p.data.id)throw new ApiError('Ne fournissez pas d’identifiant en création.',400,'BAD_REQUEST');
 const v=p.data;
 const {data,error}=await getAdminSupabase().rpc('tvplus_save_live_target',{
  p_id:v.id??null,p_name:v.name,p_provider:v.provider,p_direction:v.direction,
  p_protocol:v.protocol,p_watch_url:v.watch_url,p_enabled:v.enabled,
  p_position:v.position,p_notes:v.notes,p_endpoint:v.endpoint||null,
  p_stream_key:v.stream_key||null,p_clear_endpoint:v.clear_endpoint,p_clear_key:v.clear_key,
 });
 if(error||!data)throw new ApiError('Enregistrement sécurisé impossible.',503,'UNAVAILABLE');
 return {id:data};
}
export const POST=handleRoute(async(request:NextRequest)=>created(await save(request,false)));
export const PATCH=handleRoute(async(request:NextRequest)=>ok(await save(request,true)));
export const DELETE=handleRoute(async(request:NextRequest)=>{
 await requireV2Api('schedule.manage');
 const p=z.object({id:z.string().uuid()}).safeParse(await request.json());
 if(!p.success)throw new ApiError('Identifiant invalide.',400,'BAD_REQUEST');
 const {data,error}=await getAdminSupabase().rpc('tvplus_delete_live_target',{p_id:p.data.id});
 if(error||!data)throw new ApiError('Suppression impossible.',403,'UNAUTHORIZED');
 return ok({deleted:true});
});
