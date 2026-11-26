import {NextRequest} from 'next/server';
import {z} from 'zod';
import {createClient} from '@supabase/supabase-js';
import {createAuthClient} from '../../../../lib/auth/server';
import {clearSession} from '../../../../lib/auth/session';
import {canonicalSiteUrl} from '../../../../lib/articles/site-url';
import {safeReturnPath} from '../../../../lib/auth/return-path';
import {rateLimit} from '../../../../lib/api/rate-limit';
import {ApiError,handleRoute,ok} from '../../../../lib/api/response';
import {parseJson,emailSchema} from '../../../../lib/api/validate';
export const dynamic='force-dynamic';
const schema=z.object({email:emailSchema,password:z.string().min(10).max(200).regex(/\d/),fullName:z.string().trim().min(2).max(120),next:z.string().max(1000).optional()});

/**
 * Crée le compte sans attendre un e-mail de confirmation.
 * Si le projet Supabase exige la confirmation, la clé serveur SUPABASE_SECRET_KEY
 * permet de créer l'utilisateur déjà confirmé, puis d'ouvrir la session.
 */
async function confirmWithServiceRole(email: string, password: string, fullName: string, userId?: string) {
 const url=process.env.SUPABASE_URL?.trim(),key=process.env.SUPABASE_SECRET_KEY?.trim();
 if(!url||!key)return false;
 const admin=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
 const {error}=userId
  ? await admin.auth.admin.updateUserById(userId,{email_confirm:true})
  : await admin.auth.admin.createUser({
    email,password,email_confirm:true,user_metadata:{full_name:fullName},
   });
 if(error)throw new ApiError('Confirmation automatique impossible auprès de Supabase.',503,'UNAVAILABLE');
 return true;
}

export const POST=handleRoute(async(req:NextRequest)=>{
 if(req.headers.get('origin')!==req.nextUrl.origin)throw new ApiError('Origine refusée.',403,'UNAUTHORIZED');
 rateLimit(req,{prefix:'signup',limit:5,windowMs:600000});
 const p=parseJson(schema,await req.json());
 const next=safeReturnPath(p.next),db=await createAuthClient();
 const email=p.email.toLowerCase();
 const redirect=new URL('/auth/callback',canonicalSiteUrl());redirect.searchParams.set('next',next);
 const {data,error}=await db.auth.signUp({email,password:p.password,options:{data:{full_name:p.fullName},emailRedirectTo:redirect.href}});
 if(error){if(error.status===429)throw new ApiError('Trop de demandes. Réessayez ultérieurement.',429,'RATE_LIMITED');if(error.status&&error.status<500)throw new ApiError('Inscription impossible. Vérifiez les informations ou utilisez la connexion.',400);throw new ApiError('Service d’inscription indisponible.',503,'UNAVAILABLE');}

 let user=data.user;
 let session=data.session;
 if(!session){
  await confirmWithServiceRole(email,p.password,p.fullName,user?.id);
  const signed=await db.auth.signInWithPassword({email,password:p.password});
  if(signed.error||!signed.data.user?.email_confirmed_at){
   throw new ApiError(
    'La création de compte immédiate nécessite la confirmation automatique dans Supabase ou la variable SUPABASE_SECRET_KEY.',
    503,'UNAVAILABLE',
   );
  }
  user=signed.data.user;
  session=signed.data.session;
 }
 if(!user?.email_confirmed_at)throw new ApiError('Le compte n’a pas pu être confirmé automatiquement.',503,'UNAVAILABLE');

 const {data:profile,error:profileError}=await db.from('profiles').select('is_active,role').eq('id',user.id).maybeSingle();
 const role=profile?.is_active===true&&!profileError?await db.from('roles').select('permissions').eq('key',profile.role).maybeSingle():null;
 if(profileError||!profile?.is_active||!role?.data||role.error||!Array.isArray(role.data.permissions)){
  await db.auth.signOut();
  throw new ApiError('Profil inactif ou permissions indisponibles.',403,'UNAUTHORIZED');
 }
 await clearSession();
 return ok({needsConfirmation:false,next,session:Boolean(session)});
});
