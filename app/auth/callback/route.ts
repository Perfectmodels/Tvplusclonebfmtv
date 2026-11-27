import {NextRequest,NextResponse} from 'next/server';
import {createAuthClient} from '../../../lib/auth/server';
import {safeReturnPath} from '../../../lib/auth/return-path';
import {canonicalSiteUrl} from '../../../lib/articles/site-url';
import {recoveryConfigured,hasRecoveryIntent,setRecoveryProof} from '../../../lib/auth/recovery';
export const dynamic='force-dynamic';
function redirectPrivate(url:URL){const res=NextResponse.redirect(url);res.headers.set('Cache-Control','private, no-store');res.headers.set('Referrer-Policy','no-referrer');return res;}
export async function GET(req:NextRequest){
 const u=req.nextUrl,origin=canonicalSiteUrl(),type=u.searchParams.get('type'),recovery=u.searchParams.get('flow')==='recovery'||type==='recovery',next=safeReturnPath(u.searchParams.get('next'),'');
 const failure=new URL(recovery?'/mot-de-passe-oublie':'/connexion',origin);if(next)failure.searchParams.set('next',next);failure.searchParams.set('confirmation','failed');
 if(recovery&&!recoveryConfigured())return redirectPrivate(failure);
 const db=await createAuthClient(),code=u.searchParams.get('code'),hash=u.searchParams.get('token_hash');
 if(recovery&&hash&&type!=='recovery')return redirectPrivate(failure);
 const result=code?await db.auth.exchangeCodeForSession(code):hash&&(type==='signup'||type==='email'||type==='recovery')?await db.auth.verifyOtp({token_hash:hash,type}):null;
 if(!result||result.error||!result.data.session)return redirectPrivate(failure);
 const user=result.data.user;if(!user?.email_confirmed_at)return redirectPrivate(failure);
 if(recovery){
  // A PKCE link must originate from a password-reset request in this browser.
  // A verified recovery token hash also works when the email opens on another device.
  if(code&&(!user.email||!await hasRecoveryIntent(user.email))){await db.auth.signOut({scope:'local'});return redirectPrivate(failure);}
  await setRecoveryProof(user.id);
 }
 const destination=new URL(recovery?'/reinitialiser-mot-de-passe':next||'/compte',origin);
 if(recovery&&next)destination.searchParams.set('next',next);
 return redirectPrivate(destination);
}
