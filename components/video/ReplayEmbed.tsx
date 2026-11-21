'use client';
import { useState } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import { parseVideoUrl, videoEmbedUrl } from '../../lib/video/providers';

export default function ReplayEmbed({title,url,thumbnail}:{title:string;url:string;thumbnail?:string}){
 const [active,setActive]=useState(false);
 const detected=parseVideoUrl(url);
 const embed=detected?videoEmbedUrl(detected.platform,detected.externalId,url):'';
 return <div className="tvplus-replay-embed">
  {active&&embed?<iframe src={embed+'?autoplay=1'} title={'Lecture : '+title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" loading="lazy" />:
   <button className="tvplus-replay-launch" type="button" disabled={!embed} onClick={()=>setActive(true)} aria-label={'Lire '+title}>
    {thumbnail?<img src={thumbnail} alt="" loading="lazy"/>:<span className="tvplus-replay-cover-fallback">TV+ AFRIQUE</span>}
    <span className="tvplus-replay-play"><Play size={23} fill="currentColor"/></span>
   </button>}
  {url&&<a className="tvplus-replay-source" href={url} target="_blank" rel="noopener noreferrer">Ouvrir sur {detected?.platform||'la plateforme'} <ExternalLink size={14}/></a>}
 </div>;
}
