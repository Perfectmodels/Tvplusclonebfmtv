'use client';
import {useEffect,useRef,useState} from 'react';

type Mood='idle'|'thinking'|'answer'|'error';
const POSTER='/tvplus-robot.webp';
const MODEL='/tvplus-robot-optimized.glb';
let loader:Promise<void>|null=null;
function loadViewer(){
 if(customElements.get('model-viewer'))return Promise.resolve();
 if(loader)return loader;
 loader=new Promise<void>((resolve,reject)=>{
  const script=document.createElement('script');script.type='module';
  script.src='https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js';
  script.crossOrigin='anonymous';
  const timer=window.setTimeout(()=>reject(new Error('Visionneuse indisponible')),12000);
  script.onload=()=>{customElements.whenDefined('model-viewer').then(()=>{clearTimeout(timer);resolve();});};
  script.onerror=()=>{clearTimeout(timer);script.remove();reject(new Error('Visionneuse indisponible'));};
  document.head.appendChild(script);
 }).catch(error=>{loader=null;throw error;});
 return loader;
}

export default function RobotAvatar({mood='idle',interactive=false,onGreet}:{mood?:Mood;interactive?:boolean;onGreet?:()=>void}){
 const host=useRef<HTMLDivElement>(null),viewer=useRef<HTMLElement|null>(null);
 const [ready,setReady]=useState(false),[greet,setGreet]=useState(0);
 const [turned,setTurned]=useState(false);
 useEffect(()=>{
  if(!interactive)return;
  let cancelled=false;const ctl=new AbortController();
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection=(navigator as Navigator&{connection?:{saveData?:boolean}}).connection;
  if(connection?.saveData)return;
  const node=host.current;
  if(!node)return;
  const onMotion=()=>{const v=viewer.current;if(v){if(reduced.matches){v.removeAttribute('autoplay');(v as HTMLElement&{pause?:()=>void}).pause?.();}else{v.setAttribute('autoplay','');(v as HTMLElement&{play?:()=>void}).play?.();}}};
  async function start(){
   try{
    const res=await fetch(MODEL,{method:'HEAD',signal:ctl.signal});
    if(!res.ok||res.headers.get('content-type')?.includes('text/html'))return;
    await loadViewer();
    if(cancelled||!node)return;
    const v=document.createElement('model-viewer');viewer.current=v;
    const attrs:Record<string,string>={src:MODEL,poster:POSTER,alt:'Robot TV+ Afrique en trois dimensions', 'camera-controls':'','disable-zoom':'','disable-pan':'','touch-action':'pan-y','interaction-prompt':'none','camera-orbit':'0deg 82deg 105%','min-camera-orbit':'-50deg 55deg auto','max-camera-orbit':'50deg 110deg auto','field-of-view':'32deg','shadow-intensity':'0','animation-name':'Flottement','loading':'eager','reveal':'auto','environment-image':'neutral','exposure':'1.05'};
    for(const [name,value] of Object.entries(attrs))v.setAttribute(name,value);
    v.style.width='100%';v.style.height='100%';v.style.background='transparent';
    v.addEventListener('load',()=>{if(!cancelled)setReady(true);});
    v.addEventListener('error',()=>{if(!cancelled){setReady(false);v.remove();viewer.current=null;}});
    node.appendChild(v);onMotion();
    reduced.addEventListener('change',onMotion);
   }catch{}
  }
  void start();
  return()=>{cancelled=true;ctl.abort();reduced.removeEventListener('change',onMotion);viewer.current?.remove();viewer.current=null;};
 },[interactive]);
 useEffect(()=>{
  if(!ready||!viewer.current||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const theta=turned?-25:mood==='thinking'?12:mood==='answer'?-8:0;
  viewer.current.setAttribute('camera-orbit',theta+'deg 82deg 105%');
 },[mood,ready,turned]);
 function wave(){setGreet(v=>v+1);setTurned(v=>!v);onGreet?.();}
 return <div className={'tv-robot tv-robot--'+mood+(interactive?' tv-robot--interactive':'')} data-greet={greet}>
   <div className="tv-robot-stage">
    <img className="tv-robot-poster" src={POSTER} alt="" width={80} height={71} draggable={false} style={{visibility:ready?'hidden':'visible'}}/>
    {interactive&&<div ref={host} className={'tv-robot-model'+(ready?' is-ready':'')}/>}
   </div>
   {interactive&&<button type="button" className="tv-robot-greet" onClick={wave} aria-label="Faire réagir le robot" title="Faire réagir le robot"><span aria-hidden="true">↻</span></button>}
 </div>;
}
