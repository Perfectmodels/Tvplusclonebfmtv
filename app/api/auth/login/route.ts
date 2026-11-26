import {NextRequest} from 'next/server';
import {z} from 'zod';
import {rateLimit} from '../../../../lib/api/rate-limit';
import {handleRoute,ok,ApiError} from '../../../../lib/api/response';
import {parseJson,emailSchema} from '../../../../lib/api/validate';
import {createAuthClient} from '../../../../lib/auth/server';
import {safeReturnPath} from '../../../../lib/auth/return-path';
import {clearSession} from '../../../../lib/auth/session';
export const dynamic='force-dynamic';
const schema=z.object({email:emailSchema,password:z.string().min(6).max(200),next:z.string().max(1000).optional()});
export const POST=handleRoute(async(request:NextRequest)=>{
 if(request.headers.get('origin')!==request.nextUrl.origin)throw new ApiError('Origine refusée.',403,'UNAUTHORIZED');
 const input=parseJson(schema,await request.json());
 const email=input.email.trim().toLowerCase(),password=input.password;
 rateLimit(request,{limit:60,windowMs:60000,prefix:'login-ip'});
 rateLimit(request,{limit:10,windowMs:60000,prefix:'login-account',subject:email});
 const db=await createAuthClient();
 const {data,error}=await db.auth.signInWithPassword({email,password});
 if(error||!data.user?.email_confirmed_at){
  if(error?.status===429)throw new ApiError('Trop de tentatives de connexion. Réessayez ultérieurement.',429,'RATE_LIMITED');
  if(error?.code==='email_not_confirmed')throw new ApiError('Confirmez votre adresse e-mail avant de vous connecter.',403,'UNAUTHORIZED');
  if(error&&(!error.status||error.status>=500))throw new ApiError('Service de connexion Supabase indisponible.',503,'UNAVAILABLE');
  throw new ApiError('Adresse e-mail ou mot de passe incorrect.',401,'UNAUTHORIZED');
 }
 const {data:profile,error:profileError}=await db.from('profiles').select('is_active,role').eq('id',data.user.id).maybeSingle();
 const role=profile?.is_active===true&&!profileError?await db.from('roles').select('permissions').eq('key',profile.role).maybeSingle():null;
 if(profileError||!profile?.is_active||!role?.data||role.error||!Array.isArray(role.data.permissions)){
  await db.auth.signOut({scope:'local'});throw new ApiError('Profil inactif ou permissions indisponibles.',403,'UNAUTHORIZED');
 }
 await clearSession();
 const permissions=role.data.permissions as string[];
 const editorial=permissions.includes('articles.read_all');
 const next=safeReturnPath(input.next,editorial?'/admin-v2':'/compte');
 return ok({id:data.user.id,email:data.user.email,next:next.startsWith('/admin-v2')&&!editorial?'/compte':next});
});
