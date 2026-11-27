import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
const INTENT='tvplus_recovery_intent',PROOF='tvplus_recovery_proof';
const maxAge=15*60;
function secret(){const value=process.env.AUTH_SESSION_SECRET;if(!value||value.length<32)throw Error('Recovery signing secret not configured');return value;}
export function recoveryConfigured(){try{secret();return true;}catch{return false;}}
function digest(value:string){return createHmac('sha256',secret()).update(value).digest('base64url');}
function token(kind:string,subject:string){const data=Buffer.from(JSON.stringify({kind,subject,exp:Date.now()+maxAge*1000})).toString('base64url');return data+'.'+digest('tvplus:recovery:v1:'+data);}
function valid(value:string|undefined,kind:string,subject:string){try{if(!value)return false;const [data,mac,...extra]=value.split('.');if(extra.length||!data||!mac)return false;const a=Buffer.from(mac),b=Buffer.from(digest('tvplus:recovery:v1:'+data));if(a.length!==b.length||!timingSafeEqual(a,b))return false;const p=JSON.parse(Buffer.from(data,'base64url').toString());return p.kind===kind&&p.subject===subject&&typeof p.exp==='number'&&p.exp>Date.now();}catch{return false;}}
const options={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/',maxAge};
function emailSubject(email:string){return digest('email:'+email.trim().toLowerCase());}
export async function setRecoveryIntent(email:string){(await cookies()).set(INTENT,token('intent',emailSubject(email)),options);}
export async function hasRecoveryIntent(email:string){try{return valid((await cookies()).get(INTENT)?.value,'intent',emailSubject(email));}catch{return false;}}
export async function setRecoveryProof(userId:string){const store=await cookies();store.set(PROOF,token('proof',userId),options);store.set(INTENT,'',{...options,maxAge:0});}
export async function hasRecoveryProof(userId:string){return valid((await cookies()).get(PROOF)?.value,'proof',userId);}
export async function clearRecovery(){const store=await cookies();for(const key of [INTENT,PROOF])store.set(key,'',{...options,maxAge:0});}
