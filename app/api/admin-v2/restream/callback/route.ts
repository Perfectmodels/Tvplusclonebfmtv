import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireV2Api } from '../../../../../lib/auth/v2-admin';
import { encryptTokens, getRestreamApp, oauthCookie, restreamGet, tokenRequest } from '../../../../../lib/restream/oauth';

export const dynamic = 'force-dynamic';
export async function GET(request:NextRequest) {
  const returnTo = new URL('/admin-v2/live',request.url);
  const responseFor = (status:string) => {
    returnTo.searchParams.set('restream',status);
    const response = NextResponse.redirect(returnTo);
    response.cookies.set(oauthCookie,'',{httpOnly:true,secure:true,sameSite:'lax',path:'/api/admin-v2/restream',maxAge:0});
    response.headers.set('Cache-Control','no-store');
    response.headers.set('Referrer-Policy','no-referrer');
    return response;
  };
  try {
    const { actor, db } = await requireV2Api('schedule.manage');
    const app = getRestreamApp();
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    const cookie = request.cookies.get(oauthCookie)?.value || '';
    const expected = state ? state + '.' + actor.id : '';
    if (!app || !code || !state || code.length > 4096 || !expected ||
        Buffer.byteLength(cookie)!==Buffer.byteLength(expected) ||
        !timingSafeEqual(Buffer.from(cookie),Buffer.from(expected))) return responseFor('cancelled');
    const tokens = await tokenRequest(new URLSearchParams({
      grant_type:'authorization_code',redirect_uri:app.redirectUri,code,
    }));
    const profile = await restreamGet<{id:number|string;username?:string;email?:string}>('/v2/user/profile',tokens.access_token);
    const { error } = await db.from('restream_connections').upsert({
      id:1, account_id:String(profile.id),
      account_name:profile.username || profile.email || 'Compte Restream',
      token_ciphertext:encryptTokens(tokens),
      expires_at:new Date(tokens.expires_at*1000).toISOString(),
      connected_by:actor.id, updated_at:new Date().toISOString(),
    },{onConflict:'id'});
    if (error) return responseFor('storage-error');
    return responseFor('connected');
  } catch {
    return responseFor('error');
  }
}
