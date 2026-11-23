import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireV2Api } from '../../../../../lib/auth/v2-admin';
import { getRestreamApp, oauthCookie } from '../../../../../lib/restream/oauth';

export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  const { actor } = await requireV2Api('schedule.manage');
  const app = getRestreamApp();
  if (!app) return NextResponse.redirect(new URL('/admin-v2/live?restream=setup',request.url));
  const state = randomBytes(24).toString('base64url');
  const auth = new URL('https://api.restream.io/login');
  auth.searchParams.set('response_type','code');
  auth.searchParams.set('client_id',app.clientId);
  auth.searchParams.set('redirect_uri',app.redirectUri);
  auth.searchParams.set('state',state);
  const response = NextResponse.redirect(auth);
  response.cookies.set(oauthCookie, state + '.' + actor.id, {
    httpOnly:true, secure:true, sameSite:'lax', path:'/api/admin-v2/restream', maxAge:600,
  });
  response.headers.set('Cache-Control','no-store');
  response.headers.set('Referrer-Policy','no-referrer');
  return response;
}
