/** URL providers used by the public replay player and the editorial studio. */
export type VideoProvider='youtube'|'facebook'|'tiktok'|'vimeo'|'dailymotion';
const known:VideoProvider[]=['youtube','facebook','tiktok','vimeo','dailymotion'];
export function parseVideoUrl(value:string):{platform:VideoProvider;externalId:string;url:string}|null{
  try{
    const u=new URL(value.trim());
    if(u.protocol!=='https:' || u.username || u.password) return null;
    const host=u.hostname.toLowerCase();
    const path=u.pathname;
    let platform:VideoProvider|undefined,externalId='';
    if(host==='youtu.be'||host==='youtube.com'||host==='www.youtube.com'||host==='m.youtube.com'){
      platform='youtube';
      externalId=host==='youtu.be'?path.split('/')[1]:(u.searchParams.get('v')||path.match(/^\/(?:shorts|live|embed)\/([^/]+)/)?.[1]||'');
      if(!/^[a-zA-Z0-9_-]{11}$/.test(externalId)) return null;
    }else if(host==='tiktok.com'||host==='www.tiktok.com'||host==='m.tiktok.com'){
      platform='tiktok';externalId=path.match(/\/video\/(\d{10,25})/)?.[1]||'';
      if(!externalId) return null;
    }else if(host==='facebook.com'||host==='www.facebook.com'||host==='m.facebook.com'||host==='web.facebook.com'||host==='fb.watch'){
      platform='facebook';
      if(!/(\/videos\/|\/reel\/|\/watch\/|\/watch\?|fb\.watch)/.test(value)) return null;
      externalId=value;
    }else if(host==='vimeo.com'||host==='www.vimeo.com'||host==='player.vimeo.com'){
      platform='vimeo';externalId=path.match(/(?:\/video)?\/(\d{5,15})/)?.[1]||'';
      if(!externalId) return null;
    }else if(host==='dailymotion.com'||host==='www.dailymotion.com'||host==='dai.ly'){
      platform='dailymotion';externalId=(host==='dai.ly'?path.split('/')[1]:path.match(/\/video\/([a-zA-Z0-9]+)/)?.[1])||'';
      if(!/^[a-zA-Z0-9]+$/.test(externalId)) return null;
    }
    if(!platform||!known.includes(platform))return null;
    return {platform,externalId,url:u.toString()};
  }catch{return null}
}
export function videoWatchUrl(platform:string|null,id:string|null,sourceUrl?:string|null):string{
  if(sourceUrl&&parseVideoUrl(sourceUrl))return sourceUrl;
  if(!id)return '';
  if(platform==='youtube'&&/^[a-zA-Z0-9_-]{11}$/.test(id))return 'https://www.youtube.com/watch?v='+id;
  if(platform==='tiktok'&&/^\d{10,25}$/.test(id))return 'https://www.tiktok.com/@tvplusafrique/video/'+id;
  if(platform==='vimeo'&&/^\d+$/.test(id))return 'https://vimeo.com/'+id;
  if(platform==='dailymotion'&&/^[a-zA-Z0-9]+$/.test(id))return 'https://www.dailymotion.com/video/'+id;
  return '';
}
export function videoEmbedUrl(platform:string|null,id:string|null,sourceUrl?:string|null):string{
  const link=sourceUrl?parseVideoUrl(sourceUrl):null;
  const provider=link?.platform||platform;
  const code=link?.externalId||id;
  if(!code)return '';
  if(provider==='youtube'&&/^[a-zA-Z0-9_-]{11}$/.test(code))return 'https://www.youtube-nocookie.com/embed/'+code;
  if(provider==='tiktok'&&/^\d{10,25}$/.test(code))return 'https://www.tiktok.com/player/v1/'+code;
  if(provider==='facebook'&&link)return 'https://www.facebook.com/plugins/video.php?href='+encodeURIComponent(link.url)+'&show_text=false';
  if(provider==='vimeo'&&/^\d+$/.test(code))return 'https://player.vimeo.com/video/'+code;
  if(provider==='dailymotion'&&/^[a-zA-Z0-9]+$/.test(code))return 'https://geo.dailymotion.com/player.html?video='+code;
  return '';
}
