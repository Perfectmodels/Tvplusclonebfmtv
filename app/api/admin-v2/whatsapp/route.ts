import {NextRequest} from 'next/server';
import {z} from 'zod';
import {getV2Actor} from '../../../../lib/auth/v2-admin';
import {newsroom} from '../../../../lib/admin-v2/lws';
import {ApiError,handleRoute,ok} from '../../../../lib/api/response';
import {rateLimit} from '../../../../lib/api/rate-limit';
import {config,templates,phoneSchema,purposeSchema,sendTemplateBatch} from '../../../../lib/whatsapp/infobip';
export const dynamic='force-dynamic';
export const maxDuration=60;
async function actor(){const a=await getV2Actor();if(!a)throw new ApiError('Connexion requise.',401,'UNAUTHORIZED');if(!a.permissions.includes('settings.manage'))throw new ApiError('Accès réservé aux administrateurs autorisés.',403,'UNAUTHORIZED');return a;}
const body=z.discriminatedUnion('action',[
 z.object({action:z.literal('consent'),phone:phoneSchema,purpose:purposeSchema,proof:z.string().trim().min(10).max(250),confirmed:z.literal(true)}),
 z.object({action:z.literal('revoke'),phone:phoneSchema,purpose:purposeSchema}),
 z.object({action:z.literal('send'),requestId:z.string().uuid(),template:z.string().max(100),language:z.string().max(12),purpose:purposeSchema,phones:z.array(phoneSchema).min(1).max(5),values:z.array(z.string().trim().min(1).max(250)).max(8),confirmed:z.literal(true)})
]);
export const GET=handleRoute(async()=>{const a=await actor();const c=config();const data=await newsroom<Record<string,unknown>>(a,'whatsapp.overview');return ok({...data,configured:!!c.key,enabled:c.enabled,botEnabled:c.botEnabled,sender:c.sender,templates:templates()});});
export const POST=handleRoute(async(req:NextRequest)=>{
 const a=await actor();if(req.headers.get('origin')!==req.nextUrl.origin)throw new ApiError('Origine refusée.',403,'UNAUTHORIZED');
 rateLimit(req,{prefix:'whatsapp-admin',limit:10,windowMs:60000});
 const p=body.safeParse(await req.json().catch(()=>null));if(!p.success)throw new ApiError('Vérifiez les champs et la confirmation.',400);
 const v=p.data;
 if(v.action==='consent')return ok(await newsroom(a,'whatsapp.consent',{data:v}));
 if(v.action==='revoke')return ok(await newsroom(a,'whatsapp.revoke',{data:v}));
 const c=config();if(!c.enabled)throw new ApiError('Les envois réels ne sont pas activés.',503,'UNAVAILABLE');
 const t=templates().find(t=>t.name===v.template&&t.language===v.language&&t.purpose===v.purpose);
 if(!t||t.parameters.length!==v.values.length)throw new ApiError('Modèle non configuré ou paramètres incomplets.',400);
 const phones=[...new Set(v.phones)];
 if(t.purpose==='test'&&phones.length!==1)throw new ApiError('Un seul destinataire autorisé pour le test.',400);
 const rows=await newsroom<{rows:{id:string;phone:string}[];duplicate:boolean}>(a,'whatsapp.reserve',{data:{requestId:v.requestId,phones,purpose:v.purpose,template:t.name,language:t.language}});
 if(rows.duplicate)return ok({duplicate:true,message:'Demande déjà enregistrée. Aucun nouvel envoi.'});
 // Enregistrement préalable : si le réseau expire, ne jamais renvoyer automatiquement.
 const outcomes=await sendTemplateBatch(rows.rows,t,v.values);
 await newsroom(a,'whatsapp.outcome',{data:{outcomes}});
 return ok({outcomes});
});
