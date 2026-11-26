import {createServerClient} from '@supabase/ssr';
import {NextResponse,type NextRequest} from 'next/server';
export async function middleware(request:NextRequest){
 if(/^\/admin(?:\/|$)/.test(request.nextUrl.pathname)){
 const destination=new URL('/admin-v2'+request.nextUrl.pathname.slice(6),request.url);destination.search=request.nextUrl.search;return NextResponse.redirect(destination,307);
 }
 let response=NextResponse.next({request});
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key||!request.cookies.getAll().some(c=>c.name.startsWith('sb-')&&c.name.includes('-auth-token')))return response;
 const db=createServerClient(url,key,{cookies:{getAll:()=>request.cookies.getAll(),setAll(items){
 items.forEach(({name,value})=>request.cookies.set(name,value));
 response=NextResponse.next({request});items.forEach(({name,value,options})=>response.cookies.set(name,value,options));
 response.headers.set('Cache-Control','private, no-store');
 }}});
 await db.auth.getUser();
 return response;
}
export const config={matcher:['/admin/:path*','/admin-v2/:path*','/compte/:path*','/direct/:path*','/connexion','/inscription','/reinitialiser-mot-de-passe']};
