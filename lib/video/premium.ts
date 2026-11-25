import 'server-only';
import {getUser} from '../auth/server';
import {newsroom} from '../admin-v2/lws';
export function playbackConfig(){
 const secret=process.env.LIVE_TOKEN_BROKER_SECRET?.trim()||'';
 const hosts=(process.env.LIVE_EMBED_HOSTS||'').split(',').map(x=>x.trim().toLowerCase()).filter(h=>/^[a-z0-9.-]+$/.test(h));
 let endpoint:URL|undefined;
 try{const u=new URL(process.env.LIVE_TOKEN_BROKER_URL||'');if(u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash)endpoint=u;}catch{}
 const configured=!!endpoint&&secret.length>=32&&hosts.length>0;
 const verified=process.env.LIVE_PLAYBACK_VERIFIED==='true';
 return {endpoint,secret,hosts,configured,verified,ready:configured&&verified};
}
export async function premiumAccess(){
 const configured=playbackConfig().ready;
 try{const user=await getUser();if(!user)return {authenticated:false,entitled:false,configured,userId:null,endsAt:null};
 try{const {entitled,endsAt}=await newsroom<{entitled:boolean;endsAt:string|null}>({id:user.id,permissions:[]},'entitlements.check');
 return {authenticated:true,entitled:entitled===true&&!!endsAt&&Date.parse(endsAt)>Date.now(),configured,userId:user.id,endsAt};}
 catch{return {authenticated:true,entitled:false,configured,userId:user.id,endsAt:null};}
 }catch{return {authenticated:false,entitled:false,configured,userId:null,endsAt:null};}
}
export async function issuePlayback(userId:string,endsAt:string){
 const c=playbackConfig(),until=Date.parse(endsAt),now=Date.now(),ttlSeconds=Math.min(120,Math.floor((until-now)/1000));
 if(!c.ready||!c.endpoint||!Number.isFinite(ttlSeconds)||ttlSeconds<1)return null;
 try{
 const response=await fetch(c.endpoint,{method:'POST',headers:{Authorization:'Bearer '+c.secret,'Content-Type':'application/json'},body:JSON.stringify({subject:userId,ttlSeconds}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!response.ok)return null;const result=await response.json(),embed=new URL(result.embedUrl);
 const expiry=Date.parse(result.expiresAt);
 if(embed.protocol!=='https:'||embed.username||embed.password||embed.port||!c.hosts.includes(embed.hostname.toLowerCase())||!Number.isFinite(expiry)||expiry<=Date.now()||expiry>Math.min(until,now+ttlSeconds*1000+2000))return null;
 return {embedUrl:embed.href,expiresAt:new Date(expiry).toISOString()};
 }catch{return null;}
}
