'use client';
import {createContext,useCallback,useContext,useRef,useState,type ReactNode} from 'react';
import Link from 'next/link';
import {Headphones,X} from 'lucide-react';
type Track={title:string;source:string;cover?:string;href?:string};
const Context=createContext<{play:(track:Track)=>void}|null>(null);
export const usePodcastPlayer=()=>useContext(Context);
export default function PodcastPlaybackProvider({children}:{children:ReactNode}){
 const audio=useRef<HTMLAudioElement>(null),[track,setTrack]=useState<Track|null>(null),[error,setError]=useState(''),[speed,setSpeed]=useState(1);
 const play=useCallback((next:Track)=>{
  const el=audio.current;if(!el)return;
  setError('');
  if(el.getAttribute('src')!==next.source){el.src=next.source;el.load();}
  setTrack(next);el.play().catch(()=>setError('Lecture non démarrée. Utilisez le bouton Lecture du lecteur.'));
 },[]);
 function close(){const el=audio.current;if(el){el.pause();el.removeAttribute('src');el.load();}setTrack(null);setError('');}
 return <Context.Provider value={{play}}>{children}{track&&<div className="av-podcast-spacer" aria-hidden="true"/>}<aside hidden={!track} className="av-persistent-audio" aria-label="Lecteur audio TV+">
 {track&&<div className="av-audio-current">{track.cover?<img src={track.cover} alt=""/>:<Headphones size={26}/>}<div>{track.href?<Link href={track.href}><strong>{track.title}</strong></Link>:<strong>{track.title}</strong>}<small>TV+ Podcasts</small></div></div>}
 <audio ref={audio} controls preload="none" aria-label="Lecture du podcast" onError={()=>{if(track)setError('Le fichier audio est indisponible.');}}/>
 <label className="av-audio-speed"><span>Vitesse</span><select aria-label="Vitesse de lecture" value={speed} onChange={e=>{const n=Number(e.target.value);setSpeed(n);if(audio.current)audio.current.playbackRate=n;}}>{[.75,1,1.25,1.5,2].map(n=><option key={n} value={n}>{n}×</option>)}</select></label>
 <button className="av-audio-close" type="button" onClick={close} aria-label="Fermer le lecteur audio"><X size={20}/></button>
 {error&&track&&<p className="av-audio-error" role="alert">{error}</p>}</aside></Context.Provider>;
}
