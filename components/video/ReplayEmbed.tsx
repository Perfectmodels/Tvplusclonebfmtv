'use client';
import { useState } from 'react';
import { ExternalLink, Play, RotateCcw } from 'lucide-react';
import { parseVideoUrl, videoEmbedUrl } from '../../lib/video/providers';

export default function ReplayEmbed({title,url,thumbnail}:{title:string;url:string;thumbnail?:string}){
 const [active,setActive]=useState(false),[retry,setRetry]=useState(0),[failedImage,setFailedImage]=useState('');
 const detected=parseVideoUrl(url);
 const embed=detected?videoEmbedUrl(detected.platform,detected.externalId,url):'';
 // Only start autoplay after a deliberate click; browsers may still require the native play control.
 let playback=embed;
 if(embed&&detected){
  const u=new URL(embed);
  if(detected.platform==='sproutvideo')u.searchParams.set('autoPlay','true');
  if(['youtube','vimeo','dailymotion','facebook'].includes(detected.platform))u.searchParams.set('autoplay','1');
  playback=u.toString();
 }
 if(!embed)return <div className="tvplus-replay-embed"><p role="status">Le lien vidéo de ce contenu est indisponible. La rédaction doit le vérifier.</p></div>;
 return <div className="tvplus-replay-embed">
  {active?<iframe key={retry} src={playback} title={'Lecture : '+title} allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />:
   <button className="tvplus-replay-launch" type="button" onClick={()=>setActive(true)} aria-label={'Lire '+title}>
    {thumbnail&&thumbnail!==failedImage?<img src={thumbnail} alt="" loading="lazy" onError={()=>setFailedImage(thumbnail)}/>:<span className="tvplus-replay-cover-fallback">TV+ AFRIQUE</span>}
    <span className="tvplus-replay-play"><Play size={23} fill="currentColor"/></span>
   </button>}
  {active&&<div className="tvplus-replay-actions"><button type="button" className="tvplus-replay-source" onClick={()=>setRetry(n=>n+1)}><RotateCcw size={14}/> Relancer la vidéo</button><p>Si la vidéo ne démarre pas, utilisez la commande Lecture du lecteur. Une restriction de l’hébergeur peut empêcher la lecture.</p></div>}
  {detected&&detected.platform!=='sproutvideo'&&<a className="tvplus-replay-source" href={detected.url} target="_blank" rel="noopener noreferrer">Ouvrir sur la plateforme <ExternalLink size={14}/></a>}
 </div>;
}
