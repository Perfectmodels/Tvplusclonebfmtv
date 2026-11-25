import {createHash,timingSafeEqual,randomUUID} from 'node:crypto';
import {NextRequest} from 'next/server';
import {z} from 'zod';
import {newsroom} from '../../../../lib/admin-v2/lws';
import {ApiError,handleRoute,ok} from '../../../../lib/api/response';
import {config,phoneSchema,sendSessionText} from '../../../../lib/whatsapp/infobip';
import {listArticles} from '../../../../lib/db/repository';
import {articlePath} from '../../../../lib/articles/urls';
export const dynamic='force-dynamic';
export const maxDuration=60;
const system={id:'public',permissions:[]};
const digest=(v:string)=>createHash('sha256').update(v).digest();
const event=z.object({messageId:z.string().min(1).max(150),from:z.string().optional(),to:z.string().optional(),receivedAt:z.string().optional(),seenAt:z.string().optional(),doneAt:z.string().optional(),integrationType:z.string().optional(),message:z.object({type:z.string(),text:z.string().max(4096).optional()}).optional(),status:z.object({name:z.string().max(100),groupName:z.string().max(50)}).optional()});
async function answer(question:string){
 const q=question.trim().slice(0,120);
 const recent=/^(?:bonjour|salut|actus?|actualités|dernières actualités|news)$/i.test(q);
 const data=await listArticles(recent?{pageSize:3}:{search:q,pageSize:3});
 const origin=new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://tvplusclonebfmtv.vercel.app');
 if(origin.protocol!=='https:')throw Error('URL du site invalide');
 if(!data.items.length)return 'Aucun article correspondant. Essayez un nom, un lieu ou un mot-clé plus précis.';
 return 'Voici les articles publiés par TV+ Afrique :\n\n'+data.items.map(a=>a.title+'\n'+new URL(articlePath(a),origin).href).join('\n\n');
}
export const POST=handleRoute(async(req:NextRequest)=>{
 const secret=process.env.INFOBIP_WEBHOOK_SECRET||'';
 if(secret.length<32||!timingSafeEqual(digest(req.headers.get('authorization')||''),digest('Bearer '+secret)))throw new ApiError('Accès refusé.',401,'UNAUTHORIZED');
 const raw=await req.text();if(raw.length>100000)throw new ApiError('Payload trop volumineux.',400);
 const p=z.object({results:z.array(z.unknown()).max(30)}).safeParse(JSON.parse(raw));
 if(!p.success)throw new ApiError('Événement invalide.',400);
 const c=config();
 for(const item of p.data.results){
  const parsed=event.safeParse(item);if(!parsed.success)continue;const e=parsed.data;
  if(e.status||e.seenAt){
   const s=e.seenAt?'read':e.status?.name==='DELIVERED_TO_HANDSET'?'delivered':['REJECTED','UNDELIVERABLE','EXPIRED'].includes(e.status?.groupName||'')?'failed':'accepted';
   await newsroom(system,'whatsapp.report',{data:{id:e.messageId,state:s,providerStatus:e.seenAt?'SEEN':e.status?.name||'UNKNOWN'}});
   continue;
  }
  if(e.message?.type!=='TEXT'||!e.message.text||!e.from||e.to!==c.sender)continue;
  const phone=phoneSchema.safeParse(e.from);if(!phone.success)continue;
  const text=e.message.text.trim();
  const stop=/^(stop|arr[eê]t|d[eé]sinscri(?:ption|re)|unsubscribe|annuler)[.!\s]*$/i.test(text);
  const when=Date.parse(e.receivedAt||'');
  const active=Number.isFinite(when)&&when<=Date.now()+60000&&Date.now()-when<23*3600000;
  const inbound=await newsroom<{fresh:boolean;allowed:boolean}>(system,'whatsapp.inbound',{data:{id:e.messageId,phone:phone.data,text:text.slice(0,1000),stop}});
  if(!inbound.fresh||stop||!active||!c.botEnabled||!inbound.allowed)continue;
  // One response only per inbound message. Do not automatically resend on uncertain outcome.
  try{const reply=await answer(text);await sendSessionText(phone.data,randomUUID(),reply.slice(0,3000));}catch{}
 }
 return ok({received:true});
});
