import {NextRequest,NextResponse} from 'next/server';
import {createAuthClient} from '../../../lib/auth/server';
import {safeReturnPath} from '../../../lib/auth/return-path';
import {canonicalSiteUrl} from '../../../lib/articles/site-url';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 const u=req.nextUrl,origin=canonicalSiteUrl(),recovery=u.searchParams.get('flow')==='recovery'||u.searchParams.get('type')==='recovery',next=safeReturnPath(u.searchParams.get('next'));
 const failure=new URL(recovery?'/mot-de-passe-oublie':'/connexion',origin);
 failure.searchParams.set('next',next);
 failure.searchParams.set('confirmation','failed');
 const db=await createAuthClient();
 const code=u.searchParams.get('code'),hash=u.searchParams.get('token_hash'),type=u.searchParams.get('type');
 const result=code?await db.auth.exchangeCodeForSession(code):hash&&(type==='signup'||type==='email'||type==='recovery')?await db.auth.verifyOtp({token_hash:hash,type}):null;
 if(!result||result.error)return NextResponse.redirect(failure);
 const {data:{user},error}=await db.auth.getUser();if(error||!user?.email_confirmed_at)return NextResponse.redirect(failure);
 const destination=new URL(recovery?'/reinitialiser-mot-de-passe':next,origin);
 if(recovery)destination.searchParams.set('next',next);
 const response=NextResponse.redirect(destination);response.headers.set('Cache-Control','private, no-store');response.headers.set('Referrer-Policy','no-referrer');return response;
}
