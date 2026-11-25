import 'server-only';
import {z} from 'zod';
import {ApiError} from '../api/response';

export const phoneSchema=z.string().trim().transform(v=>v.replace(/[+\s()-]/g,'')).pipe(z.string().regex(/^[1-9][0-9]{7,14}$/,'Numéro international requis'));
export const purposeSchema=z.enum(['test','alert','newsletter','premium']);
export type Purpose=z.infer<typeof purposeSchema>;
const templateSchema=z.object({purpose:purposeSchema,name:z.string().regex(/^[a-z0-9_]{1,100}$/),language:z.string().regex(/^[a-z]{2,3}(?:_[A-Z]{2})?$/),label:z.string().max(100),parameters:z.array(z.string().max(60)).max(8)});
export type Template=z.infer<typeof templateSchema>;
const testTemplate:Template={purpose:'test',name:'test_whatsapp_template_en',language:'en',label:'Test de connexion Infobip',parameters:['Nom']};
export function config(){
 const host=(process.env.INFOBIP_BASE_URL||'https://x1zw6q.api.infobip.com').trim().replace(/\/$/,'');
 const url=new URL(host.startsWith('https://')?host:'https://'+host);
 if(url.protocol!=='https:'||!/^([a-z0-9-]+\.)?api\.infobip\.com$/i.test(url.hostname)||url.port||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new ApiError('Adresse Infobip invalide.',503,'UNAVAILABLE');
 const sender=phoneSchema.parse(process.env.INFOBIP_WHATSAPP_SENDER||'447860088970');
 const key=process.env.INFOBIP_API_KEY?.trim();
 return {origin:url.origin,sender,key,enabled:process.env.INFOBIP_SEND_ENABLED==='true'&&!!key,botEnabled:process.env.INFOBIP_BOT_ENABLED==='true'&&process.env.INFOBIP_SEND_ENABLED==='true'&&!!key};
}
export function templates():Template[]{
 try{const parsed=z.array(templateSchema).max(50).parse(JSON.parse(process.env.INFOBIP_APPROVED_TEMPLATES||'[]'));return [testTemplate,...parsed.filter(t=>t.purpose!=='test')];}catch{return [testTemplate];}
}
type Receipt={state:'accepted'|'failed'|'unknown';providerStatus:string};
function receipt(status:unknown):Receipt{
 if(!status||typeof status!=='object')return {state:'unknown',providerStatus:'NO_PROVIDER_STATUS'};
 const x=status as {groupName?:string;name?:string};const name=(x.name||x.groupName||'UNKNOWN').slice(0,100);
 return {state:['REJECTED','UNDELIVERABLE','EXPIRED'].includes(x.groupName||'')?'failed':['PENDING','DELIVERED'].includes(x.groupName||'')?'accepted':'unknown',providerStatus:name};
}
async function call(path:string,payload:unknown){
 const c=config();if(!c.enabled)throw new ApiError('Envoi WhatsApp désactivé ou non configuré.',503,'UNAVAILABLE');
 try{
  const response=await fetch(c.origin+path,{method:'POST',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),headers:{Authorization:'App '+c.key,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(payload)});
  if(!response.ok)return {http:response.status,data:null};
  return {http:response.status,data:await response.json().catch(()=>null)};
 }catch{return {http:0,data:null};}
}
export async function sendTemplateBatch(rows:{id:string;phone:string}[],template:Template,values:string[]){
 const c=config();const r=await call('/whatsapp/1/message/template',{messages:rows.map(row=>({from:c.sender,to:row.phone,messageId:row.id,content:{templateName:template.name,templateData:{body:{placeholders:values}},language:template.language}}))});
 const returned=Array.isArray(r.data?.messages)?r.data.messages:[];
 return rows.map(row=>{
  const result=returned.find((x:{messageId?:string})=>x.messageId===row.id);
  const outcome=result?receipt(result.status):{state:([400,401,403,404,422,429].includes(r.http)?'failed':'unknown') as Receipt['state'],providerStatus:r.http?'HTTP_'+r.http:'NETWORK_UNKNOWN'};
  return {id:row.id,...outcome};
 });
}
export async function sendSessionText(to:string,id:string,message:string){
 const c=config();const r=await call('/whatsapp/1/message/text',{from:c.sender,to,messageId:id,content:{text:message}});
 return receipt(r.data?.status??r.data?.messages?.[0]?.status);
}
