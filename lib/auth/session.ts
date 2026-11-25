import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'tvplus_session';
const MAX_AGE = 60 * 60 * 24 * 7;

type Session = { uid: string; exp: number };

function secret(): string {
  const value = process.env.AUTH_SESSION_SECRET;
  if (!value || value.length<32) throw new Error('AUTH_SESSION_SECRET manquant ou trop court.');
  return value;
}

function sign(body: string): string {
  return createHmac('sha256', secret()).update(body).digest('base64url');
}

export function createSessionToken(uid: string): string {
  const body = Buffer.from(JSON.stringify({ uid, exp: Date.now() + MAX_AGE * 1000 } satisfies Session)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token?: string | null): Session | null {
  if (!token) return null;
  const [body,signature,...rest]=token.split('.');
  if(rest.length)return null;
  if (!body || !signature) return null;
  let expected:string;try{expected=sign(body);}catch{return null;}
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Session;
    if (!payload.uid || typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function setSession(uid: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionToken(uid), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}
