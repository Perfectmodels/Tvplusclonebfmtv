import {NextRequest,NextResponse} from 'next/server';
import {createAuthClient} from '../../../lib/auth/server';
import {safeReturnPath} from '../../../lib/auth/return-path';
import {canonicalSiteUrl} from '../../../lib/articles/site-url';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 const u=req.nextUrl,origin=canonicalSiteUrl(),recovery=u.searchParams.get('flow')==='recovery',next=safeReturnPath(u.searchParams.get('next'));
 const db=await createAuthClient();
 const code=u.searchParams.get('code'),hash=u.searchParams.get('token_hash'),type=u.searchParams.get('type');
 const result=code?await db.auth.exchangeCodeForSession(code):hash&&(type==='signup'||type==='email'||type==='recovery')?await db.auth.verifyOtp({token_hash:hash,type}):null;
 if(!result||result.error){const dest=new URL('/connexion',origin);dest.searchParams.set('next',next);dest.searchParams.set('confirmation','failed');return NextResponse.redirect(dest);}
 const {data:{user},error}=await db.auth.getUser();if(error||!user?.email_confirmed_at){return NextResponse.redirect(new URL('/connexion?confirmation=failed',origin));}
 return NextResponse.redirect(new URL(recovery||type==='recovery'?'/reinitialiser-mot-de-passe':next,origin));
}
