import { NextResponse } from 'next/server';

/**
 * Ancien cron désactivé : le flux RSS est désormais agrégé et mis en cache
 * côté serveur, sans aucun upsert/suppression dans Supabase.
 * La réponse 410 permet d'identifier les anciennes tâches à retirer.
 */
export const dynamic = 'force-dynamic';

function retired() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'RSS_STORAGE_DISABLED',
        message: 'Import RSS désactivé. News 24/7 est désormais lu directement dans un cache serveur.',
      },
    },
    { status: 410, headers: { 'Cache-Control': 'no-store' } },
  );
}

export const GET = retired;
export const POST = retired;
