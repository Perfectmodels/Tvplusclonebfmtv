import {NextRequest} from 'next/server';
import {z} from 'zod';
import {rateLimit} from '../../../../lib/api/rate-limit';
import {handleRoute,ok,ApiError} from '../../../../lib/api/response';
import {parseJson,emailSchema} from '../../../../lib/api/validate';
import {createAuthClient} from '../../../../lib/auth/server';
import {clearSession} from '../../../../lib/auth/session';
export const dynamic='force-dynamic';
const schema=z.object({email:emailSchema,password:z.string().min(6).max(200)});
export const POST=handleRoute(async(request:NextRequest)=>{
 rateLimit(request,{limit:10,windowMs:60000,prefix:'login'});
 const {email,password}=parseJson(schema,await request.json());
 const db=await createAuthClient();
 const {data,error}=await db.auth.signInWithPassword({email,password});
 if(error||!data.user){
  if(error&&(!error.status||error.status>=500))throw new ApiError('Service de connexion Supabase indisponible.',503,'UNAVAILABLE');
  throw new ApiError('Adresse e-mail ou mot de passe incorrect.',401,'UNAUTHORIZED');
 }
 const {data:profile,error:profileError}=await db.from('profiles').select('is_active,role').eq('id',data.user.id).maybeSingle();
 const role=profile?.is_active===true&&!profileError?await db.from('roles').select('permissions').eq('key',profile.role).maybeSingle():null;
 if(profileError||!profile?.is_active||!role?.data||role.error||!Array.isArray(role.data.permissions)){
  await db.auth.signOut();throw new ApiError('Profil inactif ou permissions indisponibles.',403,'UNAUTHORIZED');
 }
 await clearSession();
 return ok({id:data.user.id,email:data.user.email});
});
