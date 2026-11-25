import 'server-only';
import {createAuthClient} from '../auth/server';
export async function premiumAccess(){
 const configured=!!(process.env.LIVE_TOKEN_BROKER_URL&&process.env.LIVE_TOKEN_BROKER_SECRET&&process.env.LIVE_EMBED_HOSTS);
 try{const db=await createAuthClient();const {data:{user}}=await db.auth.getUser();if(!user)return {authenticated:false,entitled:false,configured,userId:null};
 const now=new Date().toISOString();const {data,error}=await db.from('live_entitlements').select('id').eq('user_id',user.id).eq('status','active').lte('starts_at',now).gt('ends_at',now).limit(1);
 return {authenticated:true,entitled:!error&&!!data?.length,configured,userId:user.id};
 }catch{return {authenticated:false,entitled:false,configured,userId:null};}
}
export async function issuePlayback(userId:string){
 const url=process.env.LIVE_TOKEN_BROKER_URL,secret=process.env.LIVE_TOKEN_BROKER_SECRET,hosts=process.env.LIVE_EMBED_HOSTS?.split(',').map(x=>x.trim().toLowerCase())??[];
 if(!url||!secret||!hosts.length)return null;
 try{const endpoint=new URL(url);if(endpoint.protocol!=='https:'||endpoint.username||endpoint.password)return null;
 const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify({subject:userId,ttlSeconds:120}),cache:'no-store',signal:AbortSignal.timeout(8000)});
 if(!response.ok)return null;const result=await response.json(),embed=new URL(result.embedUrl);
 const expiry=Date.parse(result.expiresAt);if(embed.protocol!=='https:'||embed.username||embed.password||!hosts.includes(embed.hostname.toLowerCase())||!Number.isFinite(expiry)||expiry<=Date.now()||expiry>Date.now()+180000)return null;
 return {embedUrl:embed.href,expiresAt:result.expiresAt as string};
 }catch{return null;}
}
