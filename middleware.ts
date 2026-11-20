import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  // Anciennes URL longues -> URL courte définitive (redirection permanente 308).
  const legacy = request.nextUrl.pathname.match(/^\/article\/([^/]+)\/?$/);
  if (legacy) {
    const slug = decodeURIComponent(legacy[1]);
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (secret) {
      try {
        const lookup = await fetch(
          `${url}/rest/v1/articles?select=short_id&slug=eq.${encodeURIComponent(slug)}&status=eq.published&deleted_at=is.null&limit=1`,
          { headers: { apikey: secret, Authorization: `Bearer ${secret}` }, cache: 'no-store' },
        );
        const rows = await lookup.json();
        const shortId = rows?.[0]?.short_id;
        if (shortId) {
          return NextResponse.redirect(new URL(`/a/${shortId}`, request.url), 308);
        }
      } catch {
        // la page se chargera et redirigera côté RSC
      }
    }
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
