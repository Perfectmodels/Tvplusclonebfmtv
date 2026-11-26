import {NextRequest} from 'next/server';
import {z} from 'zod';
import {createAuthClient} from '../../../../lib/auth/server';
import {canonicalSiteUrl} from '../../../../lib/articles/site-url';
import {rateLimit} from '../../../../lib/api/rate-limit';
import {handleRoute,ok,ApiError} from '../../../../lib/api/response';
import {emailSchema,parseJson} from '../../../../lib/api/validate';
export const dynamic='force-dynamic';
export const POST=handleRoute(async(req:NextRequest)=>{
 if(req.headers.get('origin')!==req.nextUrl.origin)throw new ApiError('Origine refusée.',403,'UNAUTHORIZED');
 rateLimit(req,{prefix:'recovery',limit:5,windowMs:600000});
 const {email}=parseJson(z.object({email:emailSchema}),await req.json());
 const db=await createAuthClient();const url=new URL('/auth/callback?flow=recovery',canonicalSiteUrl());
 const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:url.href});
 if(error&&(error.status===429||!error.status||error.status>=500))throw new ApiError('Envoi temporairement indisponible. Réessayez ultérieurement.',503,'UNAVAILABLE');
 return ok({sent:true});
});
