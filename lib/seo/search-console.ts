import 'server-only';
import {createSign} from 'node:crypto';
import {unstable_cache} from 'next/cache';
const channels=['web','image','video','news','discover','googleNews'] as const;
type Channel=typeof channels[number];
type Metrics={clicks:number;impressions:number;ctr:number;position?:number};
type Report={channel:Channel;status:'ok'|'empty'|'error';metrics?:Metrics};
function config(){const property=process.env.GSC_PROPERTY?.trim(),email=process.env.GSC_CLIENT_EMAIL?.trim(),key=process.env.GSC_PRIVATE_KEY?.replace(/\\n/g,'\n');return property&&email&&key?{property,email,key}:null;}
export const searchConsoleConfigured=()=>!!config();
async function token(email:string,key:string){
 const now=Math.floor(Date.now()/1000);
 const b64=(obj:unknown)=>Buffer.from(JSON.stringify(obj)).toString('base64url');
 const unsigned=b64({alg:'RS256',typ:'JWT'})+'.'+b64({iss:email,scope:'https://www.googleapis.com/auth/webmasters.readonly',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
 const signature=createSign('RSA-SHA256').update(unsigned).end().sign(key).toString('base64url');
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:unsigned+'.'+signature}),cache:'no-store',signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('OAuth Google indisponible');
 const json=await response.json();if(typeof json.access_token!=='string')throw new Error('Jeton absent');return json.access_token as string;
}
const queryCached=unstable_cache(async (property:string,startDate:string,endDate:string):Promise<Report[]>=>{
 const cfg=config();if(!cfg||cfg.property!==property)throw new Error('Configuration absente');
 const access=await token(cfg.email,cfg.key);
 return Promise.all(channels.map(async(channel):Promise<Report>=>{
  try{
   const response=await fetch('https://www.googleapis.com/webmasters/v3/sites/'+encodeURIComponent(property)+'/searchAnalytics/query',{method:'POST',headers:{Authorization:'Bearer '+access,'Content-Type':'application/json'},body:JSON.stringify({startDate,endDate,type:channel,rowLimit:1,dataState:'final'}),cache:'no-store',signal:AbortSignal.timeout(10000)});
   if(!response.ok)return {channel,status:'error'};
   const body=await response.json();const m=body.rows?.[0];
   if(!m)return {channel,status:'empty'};
   if(![m.clicks,m.impressions,m.ctr].every(Number.isFinite))return {channel,status:'error'};
   return {channel,status:'ok',metrics:{clicks:m.clicks,impressions:m.impressions,ctr:m.ctr,position:Number.isFinite(m.position)&&!['discover','googleNews'].includes(channel)?m.position:undefined}};
  }catch{return {channel,status:'error'};}
 }));
},['gsc-readonly-28d-v1'],{revalidate:3600});
export async function searchConsoleReport(){
 const cfg=config();if(!cfg)return {status:'unconfigured' as const,reports:[] as Report[]};
 const day=86400000;const end=new Date(Date.now()-3*day),start=new Date(end.getTime()-27*day);
 const startDate=start.toISOString().slice(0,10),endDate=end.toISOString().slice(0,10);
 try{return {status:'configured' as const,startDate,endDate,reports:await queryCached(cfg.property,startDate,endDate)};}
 catch{return {status:'error' as const,reports:[] as Report[]};}
}
