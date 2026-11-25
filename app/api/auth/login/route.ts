import {NextRequest} from 'next/server';
import {z} from 'zod';
import {rateLimit} from '../../../../lib/api/rate-limit';
import {handleRoute,ok,ApiError} from '../../../../lib/api/response';
import {parseJson,emailSchema} from '../../../../lib/api/validate';
import {newsroom} from '../../../../lib/admin-v2/lws';
import {verifyPassword} from '../../../../lib/auth/password';
import {setSession} from '../../../../lib/auth/session';
export const dynamic='force-dynamic';
const schema=z.object({email:emailSchema,password:z.string().min(6).max(200)});
type LoginProfile={id:string;email:string;password_hash:string;is_active:boolean};
export const POST=handleRoute(async(request:NextRequest)=>{
 rateLimit(request,{limit:10,windowMs:60000,prefix:'login'});
 const {email,password}=parseJson(schema,await request.json());
 let profile:LoginProfile|null=null;
 try{profile=await newsroom<LoginProfile>({id:'public',permissions:[]},'auth.login',{data:{email}});}catch{}
 if(!profile?.is_active||!verifyPassword(password,profile.password_hash??''))throw new ApiError('Adresse e-mail ou mot de passe incorrect.',401,'UNAUTHORIZED');
 await setSession(profile.id);return ok({id:profile.id,email:profile.email});
});
