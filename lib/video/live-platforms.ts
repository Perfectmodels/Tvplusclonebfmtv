
/**
 * Diffuseurs que la régie sait documenter et enregistrer.
 * Enregistrer un endpoint ne déclenche PAS une diffusion depuis Vercel.
 * OBS ou une passerelle de multidiffusion reste responsable de l'envoi.
 */
export const STREAM_PROVIDERS = [
  { id:'restream',label:'Restream',help:'Ingestion RTMPS, SRT ou WHIP ; lecteur Restream séparé',docs:'https://support.restream.io/en/articles/111656-connect-obs-to-restream' },
  { id:'youtube',label:'YouTube Live',help:'Adresse RTMPS + clé de la salle de contrôle',docs:'https://support.google.com/youtube/answer/2907883' },
  { id:'facebook',label:'Facebook Live',help:'URL RTMPS et clé de Live Producer',docs:'https://www.facebook.com/live/producer/' },
  { id:'instagram',label:'Instagram Live',help:'Accès Live Producer et clé selon éligibilité du compte',docs:'https://www.instagram.com/' },
  { id:'tiktok',label:'TikTok LIVE',help:'RTMP seulement si le compte dispose de la fonction',docs:'https://www.tiktok.com/' },
  { id:'twitch',label:'Twitch',help:'Serveur d’ingestion Twitch et clé de diffusion',docs:'https://dev.twitch.tv/docs/video-broadcast/' },
  { id:'linkedin',label:'LinkedIn Live',help:'RTMP ou service partenaire selon les droits du compte',docs:'https://www.linkedin.com/' },
  { id:'kick',label:'Kick',help:'Configuration RTMP fournie par le compte',docs:'https://kick.com/' },
  { id:'x',label:'X / Twitter',help:'Disponibilité conditionnelle à la formule et au compte',docs:'https://x.com/' },
  { id:'dailymotion',label:'Dailymotion',help:'RTMP et page publique du live',docs:'https://www.dailymotion.com/' },
  { id:'vimeo',label:'Vimeo',help:'Configuration événement/RTMP de Vimeo Live',docs:'https://vimeo.com/' },
  { id:'restreamstudio',label:'Restream Studio',help:'Production web avec diffusion via Restream',docs:'https://restream.io/' },
  { id:'streamyard',label:'StreamYard',help:'Studio en ligne et sorties multistream',docs:'https://streamyard.com/' },
  { id:'castr',label:'Castr',help:'Ingestion et diffusion multicanal',docs:'https://castr.com/' },
  { id:'mux',label:'Mux',help:'Ingestion RTMP avec lecture HLS',docs:'https://www.mux.com/' },
  { id:'cloudflare',label:'Cloudflare Stream',help:'Ingestion RTMP/SRT et lecture HLS ou iframe',docs:'https://www.cloudflare.com/products/cloudflare-stream/' },
  { id:'wowza',label:'Wowza',help:'Serveur de diffusion et lecteur HLS',docs:'https://www.wowza.com/' },
  { id:'livepeer',label:'Livepeer',help:'Streaming RTMP et restitution HLS',docs:'https://livepeer.org/' },
  { id:'obs',label:'OBS Studio / régie locale',help:'Logiciel émetteur (pas de serveur de streaming)',docs:'https://obsproject.com/' },
  { id:'vmix',label:'vMix',help:'Régie audiovisuelle et encodeur',docs:'https://www.vmix.com/' },
  { id:'custom',label:'RTMP / SRT / WHIP personnalisé',help:'Adresse et clé fournies par un prestataire externe',docs:'' },
] as const;

export const LIVE_PLAYER_PLATFORMS = [
 ['hls','Flux HLS HTTPS (.m3u8)'],
 ['restream','Lecteur web Restream (iframe)'],
 ['youtube','YouTube Live (page vidéo)'],
 ['facebook','Facebook Live (page vidéo)'],
 ['twitch','Twitch (chaîne)'],
 ['vimeo','Vimeo Live (page vidéo)'],
 ['dailymotion','Dailymotion (page vidéo)'],
 ['tiktok','TikTok LIVE (lien externe)'],
 ['custom','Autre : HLS ou lecteur connu'],
] as const;

export type LivePlayerPlatform = (typeof LIVE_PLAYER_PLATFORMS)[number][0];

export const LIVE_PLAYER_IDS = LIVE_PLAYER_PLATFORMS.map(p=>p[0]) as [LivePlayerPlatform,...LivePlayerPlatform[]];

export type LivePlayback = {
  playbackUrl: string;
  hlsUrl: string;
  embedUrl: string;
  externalUrl: string;
  supported: boolean;
};

const empty = (): LivePlayback => ({ playbackUrl:'',hlsUrl:'',embedUrl:'',externalUrl:'',supported:false });

/** Le code iframe est uniquement analysé pour son attribut src, jamais inséré en HTML. */
export function extractLiveUrl(input:string):string {
 const trimmed=input.trim();
 const match=trimmed.match(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
 return (match ? match[1] : trimmed).replace(/&amp;/g,'&').trim();
}

function parsedHttps(input:string):URL|null {
 try {
  const url = new URL(extractLiveUrl(input));
  if(url.protocol!=='https:' || url.username || url.password || !url.hostname || /\s/.test(input))return null;
  return url;
 } catch {return null;}
}
const hostIs=(host:string,match:string)=>host===match||host===`www.${match}`;
const restreamPlayer=(host:string)=>host==='player.restream.io';
function validEmbedHost(host:string) {
 return restreamPlayer(host) ||
  host==='iframe.videodelivery.net' ||
  /^customer-[a-z0-9-]+\.cloudflarestream\.com$/.test(host) ||
  host==='player.vimeo.com' ||
  host==='www.youtube-nocookie.com' ||
  host==='www.youtube.com' ||
  host==='geo.dailymotion.com' ||
  host==='player.castr.com';
}
function youtubeId(url:URL) {
 const h=url.hostname.toLowerCase();
 if(h==='youtu.be')return url.pathname.split('/')[1];
 if(hostIs(h,'youtube.com')||h==='m.youtube.com'||h==='www.youtube-nocookie.com')return url.searchParams.get('v')||url.pathname.match(/^\/(?:live|shorts|embed)\/([\w-]+)/)?.[1]||'';
 return '';
}

export function resolveLivePlayback(platform:string,input:string,siteHostname='tvplusv2.vercel.app'):LivePlayback {
 const url=parsedHttps(input);
 if(!url)return empty();
 const host=url.hostname.toLowerCase();
 const externalUrl=url.toString();
 const base={playbackUrl:externalUrl,hlsUrl:'',embedUrl:'',externalUrl,supported:true};
 const isHls=/\.m3u8$/i.test(url.pathname);
 if(platform==='hls' || isHls){
  return isHls ? {...base,hlsUrl:externalUrl} : empty();
 }
 if(platform==='restream'){
  return restreamPlayer(host) ? {...base,embedUrl:externalUrl} : {...base,supported:false};
 }
 if(platform==='youtube'){
  const id=youtubeId(url);
  return /^[\w-]{11}$/.test(id) ? {...base,embedUrl:`https://www.youtube-nocookie.com/embed/${id}`} : {...base,supported:false};
 }
 if(platform==='facebook'){
  const facebook=hostIs(host,'facebook.com')||host==='m.facebook.com'||host==='web.facebook.com'||host==='fb.watch';
  const video=/\/videos\/|\/watch\/|\/watch\?|\/live\/|\/reel\//.test(externalUrl);
  return facebook && video
   ? {...base,embedUrl:`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(externalUrl)}&show_text=false`}
   : {...base,supported:false};
 }
 if(platform==='vimeo'){
  const m=(hostIs(host,'vimeo.com')||host==='player.vimeo.com') ? url.pathname.match(/\/(?:video\/)?(\d{5,15})/) : null;
  return m ? {...base,embedUrl:`https://player.vimeo.com/video/${m[1]}`} : {...base,supported:false};
 }
 if(platform==='dailymotion'){
  const id=hostIs(host,'dailymotion.com')?url.pathname.match(/\/video\/([A-Za-z0-9]+)/)?.[1]:host==='dai.ly'?url.pathname.slice(1):'';
  return /^[A-Za-z0-9]+$/.test(id||'')?{...base,embedUrl:`https://geo.dailymotion.com/player.html?video=${id}`}:{...base,supported:false};
 }
 if(platform==='twitch'){
  const name=hostIs(host,'twitch.tv')?url.pathname.match(/^\/([A-Za-z0-9_]{2,25})\/?$/)?.[1]:null;
  if(!name)return {...base,supported:false};
  const parent=/^[a-z0-9.-]+$/i.test(siteHostname)?siteHostname:'tvplusv2.vercel.app';
  return {...base,embedUrl:`https://player.twitch.tv/?channel=${encodeURIComponent(name)}&parent=${encodeURIComponent(parent)}`};
 }
 if(platform==='custom' && validEmbedHost(host)) return {...base,embedUrl:externalUrl};
 // TikTok LIVE et d'autres diffuseurs ne garantissent pas un lecteur iframe public.
 return {...base,supported:false};
}

/** Les URLs d'ingestion (dont WHIP) ne sont pas des liens de visionnage. */
export function isSafePublicWatchUrl(input:string):boolean {
 if(!input)return true;
 const url=parsedHttps(input);
 if(!url)return false;
 const h=url.hostname.toLowerCase();
 return !((h==='live.restream.io' && /\/whip\/|\/live\//.test(url.pathname)) ||
   /(?:^|\.)rtmp\./.test(h) || /(?:^|\.)ingest\./.test(h) ||
   /\/whip\//i.test(url.pathname));
}

export function isValidIngestEndpoint(protocol:string,input:string) {
 if(!input)return true;
 try{
  const url=new URL(input.trim());
  if(url.username||url.password||!url.hostname)return false;
  if(protocol==='rtmps')return url.protocol==='rtmps:';
  if(protocol==='rtmp')return ['rtmp:','rtmps:'].includes(url.protocol);
  if(protocol==='srt')return url.protocol==='srt:';
  if(protocol==='whip')return url.protocol==='https:';
  return ['https:','rtmps:','rtmp:','srt:'].includes(url.protocol);
 }catch{return false;}
}
