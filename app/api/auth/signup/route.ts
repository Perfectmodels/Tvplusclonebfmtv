import {NextRequest} from 'next/server';
import {z} from 'zod';
import {createAuthClient} from '../../../../lib/auth/server';
import {canonicalSiteUrl} from '../../../../lib/articles/site-url';
import {safeReturnPath} from '../../../../lib/auth/return-path';
import {rateLimit} from '../../../../lib/api/rate-limit';
import {ApiError,handleRoute,ok} from '../../../../lib/api/response';
import {parseJson,emailSchema} from '../../../../lib/api/validate';
export const dynamic='force-dynamic';
const schema=z.object({email:emailSchema,password:z.string().min(10).max(200).regex(/\d/),fullName:z.string().trim().min(2).max(120),next:z.string().max(1000).optional()});
export const POST=handleRoute(async(req:NextRequest)=>{
 if(req.headers.get('origin')!==req.nextUrl.origin)throw new ApiError('Origine refusée.',403,'UNAUTHORIZED');
 rateLimit(req,{prefix:'signup',limit:5,windowMs:600000});
 const p=parseJson(schema,await req.json());
 const next=safeReturnPath(p.next),db=await createAuthClient();
 const redirect=new URL('/auth/callback',canonicalSiteUrl());redirect.searchParams.set('next',next);
 const {data,error}=await db.auth.signUp({email:p.email.toLowerCase(),password:p.password,options:{data:{full_name:p.fullName},emailRedirectTo:redirect.href}});
 if(error){if(error.status===429)throw new ApiError('Trop de demandes. Réessayez ultérieurement.',429,'RATE_LIMITED');if(error.status&&error.status<500)throw new ApiError('Inscription impossible. Vérifiez les informations ou utilisez la connexion.',400);throw new ApiError('Service d’inscription indisponible.',503,'UNAVAILABLE');}
 if(data.session&&data.user?.email_confirmed_at)return ok({needsConfirmation:false,next});
 return ok({needsConfirmation:true,next});
});
