import 'server-only';
import { restreamGet } from './oauth';
import { resolveLivePlayback } from '../video/live-platforms';

type NewChannel = {
 id: number; platformId?: number; channelUrl?: string | null;
 displayName?: string | null;
};
type OldChannel = {
 id: number; streamingPlatformId?: number; embedUrl?: string | null;
 url?: string | null; displayName?: string | null; active?: boolean;
};
type RestreamEvent = {
 title?: string; status?: string; isRecordOnly?: boolean;
 destinations?: { streamingPlatformId?: number; externalUrl?: string | null }[];
};
export type RestreamDiscovery = {
 channels: {id:number;name:string;url:string;platformId:number;isEmbedPlayer:boolean}[];
 embedPlayerUrl:string; hasEmbedChannel:boolean; youtubeLiveUrl:string;
 liveEventTitle:string; inProgressCount:number;
 warnings:string[];
};

function getHttpsLink(value:unknown) {
 if (typeof value !== 'string') return '';
 try {
  const url=new URL(value);
  return url.protocol==='https:' && !url.username && !url.password ? url.toString() : '';
 } catch { return ''; }
}

/** The Restream website player is an external, publicly embeddable iframe.
 * Never expose streaming ingest credentials or OAuth tokens in this output. */
export async function discoverRestreamSources(token:string):Promise<RestreamDiscovery> {
 const [modern,legacy,events]=await Promise.allSettled([
  restreamGet<{channels?:NewChannel[]} | NewChannel[]>('/v2/user/channels',token),
  restreamGet<OldChannel[]>('/v2/user/channel/all',token),
  restreamGet<RestreamEvent[] | {events?:RestreamEvent[]}>('/v2/user/events/in-progress',token),
 ]);
 if (modern.status==='rejected' && legacy.status==='rejected') {
  throw new Error('Restream ne permet pas de récupérer les chaînes de ce compte.');
 }
 const recent=modern.status==='fulfilled'
  ? (Array.isArray(modern.value) ? modern.value : modern.value.channels || []) : [];
 const old=legacy.status==='fulfilled'&&Array.isArray(legacy.value) ? legacy.value : [];
 const byId=new Map<number,NewChannel & OldChannel>();
 for (const channel of old) {
  if(typeof channel.id === 'number') byId.set(channel.id,{...channel});
 }
 for (const channel of recent) {
  if(typeof channel.id === 'number') byId.set(channel.id,{...byId.get(channel.id),...channel});
 }
 const channels=Array.from(byId.values()).map(c => {
  const platformId=c.platformId??c.streamingPlatformId??0;
  return {
   id:c.id,
   name:c.displayName||'Chaîne Restream',
   url:getHttpsLink(c.channelUrl||c.url),
   platformId,
   isEmbedPlayer:platformId===83,
   embedCandidate:c.embedUrl||c.channelUrl||'',
  };
 });
 const embed=channels.filter(c=>c.isEmbedPlayer);
 const embedPlayerUrl=embed
  .map(c=>resolveLivePlayback('restream',c.embedCandidate).embedUrl)
  .find(Boolean)||'';
 const active=events.status==='fulfilled'
  ? (Array.isArray(events.value)?events.value:events.value.events||[])
  : [];
 const current=active.find(e=>e.status==='in-progress'&&!e.isRecordOnly) || null;
 const youtubeLiveUrl=current?.destinations?.filter(d=>d.streamingPlatformId===5)
  .map(d=>getHttpsLink(d.externalUrl))
  .find(url=>resolveLivePlayback('youtube',url).embedUrl) || '';
 const warnings:string[]=[];
 if (modern.status==='rejected') warnings.push('Lecture des chaînes sur la nouvelle API Restream indisponible.');
 if (events.status==='rejected') warnings.push('Statut du direct non disponible. Vérifiez l’autorisation stream.read.');
 return {
  channels:channels.map(({embedCandidate,...c})=>c),
  embedPlayerUrl,hasEmbedChannel:embed.length>0,youtubeLiveUrl,
  liveEventTitle:current?.title||'',inProgressCount:active.length,warnings,
 };
}
