import {NextResponse,type NextRequest} from 'next/server';
export function middleware(request:NextRequest){
 if(/^\/admin(?:\/|$)/.test(request.nextUrl.pathname)){
  const destination=new URL('/admin-v2'+request.nextUrl.pathname.slice(6),request.url);destination.search=request.nextUrl.search;return NextResponse.redirect(destination,307);
 }
 return NextResponse.next();
}
export const config={matcher:['/admin/:path*']};
