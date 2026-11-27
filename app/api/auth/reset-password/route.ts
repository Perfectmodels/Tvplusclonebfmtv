import {NextRequest} from 'next/server';
import {z} from 'zod';
import {hasRecoveryProof,clearRecovery} from '../../../../lib/auth/recovery';
import {createAuthClient} from '../../../../lib/auth/server';
import {handleRoute,ok,ApiError} from '../../../../lib/api/response';
import {rateLimit} from '../../../../lib/api/rate-limit';
import {parseJson} from '../../../../lib/api/validate';
export const POST=handleRoute(async(req:NextRequest)=>{
 if(req.headers.get('origin')!==req.nextUrl.origin)throw new ApiError('Origine refusée.',403,'UNAUTHORIZED');
 rateLimit(req,{prefix:'reset',limit:5,windowMs:600000});
 const {password}=parseJson(z.object({password:z.string().min(10).max(200).regex(/\d/)}),await req.json());
 const db=await createAuthClient(),{data:{user}}=await db.auth.getUser();
 if(!user?.email_confirmed_at||!await hasRecoveryProof(user.id))throw new ApiError('Lien de récupération invalide ou expiré.',401,'UNAUTHORIZED');
 const {error}=await db.auth.updateUser({password});if(error)throw new ApiError('Le mot de passe n’a pas pu être modifié.',400);
 await clearRecovery();await db.auth.signOut({scope:'global'});return ok({updated:true});
});
