import { type NextRequest } from 'next/server';
import { requireV2Api } from '../../../../lib/auth/v2-admin';
import { decryptTokens, getRestreamApp, getSavedConnection, getValidToken } from '../../../../lib/restream/oauth';
import { discoverRestreamSources } from '../../../../lib/restream/discovery';
import { handleRoute, ok, ApiError } from '../../../../lib/api/response';

export const dynamic = 'force-dynamic';
export const GET = handleRoute(async () => {
  const { db } = await requireV2Api('schedule.manage');
  const configured = Boolean(getRestreamApp());
  if (!configured) return ok({ configured: false, connected: false, channels: [] });
  const connection = await getSavedConnection(db);
  if (!connection) return ok({ configured: true, connected: false, channels: [] });
  try {
    const accessToken = await getValidToken(db, connection);
    const discovery = await discoverRestreamSources(accessToken);
    return ok({
      configured:true, connected:true, account:connection.account_name,
      channels:discovery.channels,embedPlayerUrl:discovery.embedPlayerUrl,
      hasEmbedChannel:discovery.hasEmbedChannel,
      liveEventTitle:discovery.liveEventTitle,
      inProgressCount:discovery.inProgressCount,
      warning:discovery.warnings.join(' '),
    });
  } catch {
    return ok({ configured:true, connected:true, account:connection.account_name,
      channels: [], warning:'Compte relié, mais impossible de récupérer les chaînes. Vérifiez les autorisations Restream.' });
  }
});

export const DELETE = handleRoute(async (request: NextRequest) => {
  const { db } = await requireV2Api('schedule.manage');
  const origin = request.headers.get('origin');
  if (!origin || origin !== request.nextUrl.origin) throw new ApiError('Origine non autorisée.',403,'UNAUTHORIZED');
  const connection = await getSavedConnection(db);
  if (!connection) return ok({ disconnected:true });
  if (getRestreamApp()) {
    try {
      const tokens = decryptTokens(connection.token_ciphertext);
      const revoked = await fetch('https://api.restream.io/oauth/revoke',{
        method:'POST', cache:'no-store', signal:AbortSignal.timeout(10000),
        headers:{ 'Content-Type':'application/x-www-form-urlencoded' },
        body:new URLSearchParams({token:tokens.refresh_token,token_type_hint:'refresh_token'}),
      });
      if (!revoked.ok) throw new Error('Restream n’a pas confirmé la révocation.');
    } catch {
      throw new ApiError('Impossible de révoquer le jeton Restream. Réessayez.',502,'UNAVAILABLE');
    }
  }
  const { error } = await db.from('restream_connections').delete().eq('id',1);
  if (error) throw new ApiError('Impossible de supprimer la connexion.',503,'UNAVAILABLE');
  return ok({ disconnected:true });
});
