import {NextRequest} from 'next/server';
import {z} from 'zod';
import {createAuthClient} from '../../../../lib/auth/server';
import {clearRecovery} from '../../../../lib/auth/recovery';
import {clearSession} from '../../../../lib/auth/session';
import {safeReturnPath} from '../../../../lib/auth/return-path';
import {rateLimit} from '../../../../lib/api/rate-limit';
import {ApiError,handleRoute,ok} from '../../../../lib/api/response';
import {parseJson,emailSchema} from '../../../../lib/api/validate';
export const dynamic='force-dynamic';
const schema=z.object({email:emailSchema,password:z.string().min(10).max(200).regex(/\d/),fullName:z.string().trim().min(2).max(120),next:z.string().max(1000).optional()});

export const POST=handleRoute(async(req:NextRequest)=>{
 if(req.headers.get('origin')!==req.nextUrl.origin)throw new ApiError('Origine refusée.',403,'UNAUTHORIZED');
 const p=parseJson(schema,await req.json());
 const email=p.email.trim().toLowerCase();
 rateLimit(req,{prefix:'signup-ip',limit:30,windowMs:600000});
 rateLimit(req,{prefix:'signup-account',limit:5,windowMs:600000,subject:email});
 const next=safeReturnPath(p.next),db=await createAuthClient();
 // Never confirm an existing account through a public signup request.
 const {data,error}=await db.auth.signUp({email,password:p.password,options:{data:{full_name:p.fullName}}});
 if(error){
  if(error.code==='over_email_send_rate_limit')throw new ApiError('Le service de confirmation par e-mail a atteint sa limite. Réessayez ultérieurement ou connectez-vous si vous avez déjà un compte.',429,'RATE_LIMITED');
  if(error.status===429)throw new ApiError('Trop de demandes auprès du service de connexion. Réessayez ultérieurement.',429,'RATE_LIMITED');
  if(error.status&&error.status<500)throw new ApiError('Inscription impossible. Vérifiez les informations ou utilisez la connexion.',400);
  throw new ApiError('Service d’inscription temporairement indisponible.',503,'UNAVAILABLE');
 }
 if(!data.session)throw new ApiError('La création immédiate du compte est indisponible. Si vous êtes déjà inscrit, utilisez la connexion. Sinon contactez le support.',503,'UNAVAILABLE');
 const user=data.user;
 if(!user?.email_confirmed_at){await db.auth.signOut({scope:'local'});throw new ApiError('La confirmation du compte est nécessaire.',403,'UNAUTHORIZED');}
 const {data:profile,error:profileError}=await db.from('profiles').select('is_active,role').eq('id',user.id).maybeSingle();
 const role=profile?.is_active===true&&!profileError?await db.from('roles').select('permissions').eq('key',profile.role).maybeSingle():null;
 if(profileError||role?.error){await db.auth.signOut({scope:'local'});throw new ApiError('Service des profils temporairement indisponible.',503,'UNAVAILABLE');}
 if(!profile?.is_active||!role?.data||!Array.isArray(role.data.permissions)){
  await db.auth.signOut({scope:'local'});throw new ApiError('Profil inactif ou permissions indisponibles.',403,'UNAUTHORIZED');
 }
 await clearSession();await clearRecovery();
 return ok({next:next.startsWith('/admin-v2')?'/compte':next,session:true});
});
