'use client';
import {useEffect,useRef,useState} from 'react';
import {ExternalLink,Headphones,Play,Video} from 'lucide-react';
import {mediaSource,type StudioKind} from '../../lib/media/studio-types';
import {usePodcastPlayer} from './PodcastPlaybackProvider';
import {parseVideoUrl,videoEmbedUrl,videoPlaybackUrl} from '../../lib/video/providers';
export default function MediaPlayback({kind,title,source,cover,href,preview=false}:{kind:StudioKind;title:string;source:string;cover?:string;href?:string;preview?:boolean}){
 const [active,setActive]=useState(false),[error,setError]=useState('');
 const video=useRef<HTMLVideoElement>(null),podcast=usePodcastPlayer();
 const valid=mediaSource(kind,source),path=valid?new URL(source).pathname:'',directAudio=kind==='podcast'&&/\.(mp3|m4a|ogg|wav|aac)$/i.test(path),hls=kind!=='podcast'&&/\.m3u8$/i.test(path),directVideo=kind!=='podcast'&&/\.(mp4|webm)$/i.test(path),detected=kind!=='podcast'&&valid?parseVideoUrl(source):null,embed=detected?videoEmbedUrl(detected.platform,detected.externalId,source):'';
 const playback=embed&&detected?.platform==='sproutvideo'?videoPlaybackUrl(embed,detected.platform):embed;
 useEffect(()=>{if(!active||!hls||!video.current)return;const element=video.current;let dispose=false;let instance:{destroy:()=>void}|undefined;
  if(element.canPlayType('application/vnd.apple.mpegurl')){element.src=source;return()=>{element.removeAttribute('src');element.load();};}
  void import('hls.js').then(({default:Hls})=>{if(dispose)return;if(!Hls.isSupported()){setError('Ce navigateur ne prend pas en charge ce flux.');return;}const h=new Hls();instance=h;h.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal)setError('Le flux vidéo est momentanément indisponible.');});h.loadSource(source);h.attachMedia(element);}).catch(()=>{if(!dispose)setError('Le lecteur ne peut pas être chargé.');});return()=>{dispose=true;instance?.destroy();};
 },[active,hls,source]);
 const Icon=kind==='podcast'?Headphones:Video;
 if(!valid)return <div className={'studio-playback studio-playback-empty '+kind}><Icon size={34}/><p>{preview?'Renseignez une source compatible pour afficher le lecteur.':'Ce média est temporairement indisponible.'}</p></div>;
 return <div className={'studio-playback '+kind}>
 {kind==='podcast'?<><div className="studio-audio-cover">{cover?<img src={cover} alt="" loading="lazy"/>:<Headphones size={48}/>}</div>{directAudio?(!preview&&podcast?<button type="button" className="av-audio-play" onClick={()=>podcast.play({title,source,cover,href})}><Play size={18} fill="currentColor"/> Écouter le podcast</button>:<audio controls preload="none" src={source} aria-label={'Écouter '+title} onError={()=>setError('Le fichier audio ne peut pas être lu.')}/>):<a href={source} target="_blank" rel="noopener noreferrer">Écouter sur la plateforme <ExternalLink size={15}/></a>}</>:<><div className="studio-video-stage">{active?(embed?<iframe src={playback} title={'Lecture : '+title} allow="autoplay; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin"/>:directVideo||hls?<video ref={video} controls playsInline preload="metadata" poster={cover||undefined} src={directVideo?source:undefined} onError={()=>setError('La vidéo ne peut pas être lue.')}/>:null):<button type="button" className="studio-play-start" onClick={()=>setActive(true)} aria-label={'Ouvrir le lecteur : '+title}>{cover&&<img src={cover} alt="" loading="lazy"/>}<span><Play fill="currentColor" size={25}/></span></button>}</div>{active&&<button className="studio-player-close" type="button" onClick={()=>{setActive(false);setError('');}}>Fermer le lecteur</button>}</>}
 {error&&<p role="alert">{error}</p>}
 {kind!=='podcast'&&<a href={source} target="_blank" rel="noopener noreferrer">Ouvrir la source <ExternalLink size={14}/></a>}
 </div>;
}
