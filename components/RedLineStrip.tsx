'use client';

import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import RedLineCard from './RedLineCard';
import type { RedLineItem } from '../lib/media/red-line';

export default function RedLineStrip({title,href,items,emptyMessage,id}:{
 title:string;href:string;items:RedLineItem[];emptyMessage?:string;id?:string;
}) {
 const track=useRef<HTMLDivElement>(null);
 const trackId=useId();
 const [position,setPosition]=useState({previous:false,next:false});
 useEffect(()=>{
  const el=track.current;
  if(!el)return;
  const update=()=>{const previous=el.scrollLeft>3,next=el.scrollLeft+el.clientWidth<el.scrollWidth-3;setPosition(old=>old.previous===previous&&old.next===next?old:{previous,next});};
  update();
  el.addEventListener('scroll',update,{passive:true});
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(update):null;
  observer?.observe(el);
  window.addEventListener('resize',update);
  return()=>{el.removeEventListener('scroll',update);observer?.disconnect();window.removeEventListener('resize',update);};
 },[items.length]);
 function move(direction:number){
  const el=track.current;if(!el)return;
  const card=el.firstElementChild;
  const distance=card?card.getBoundingClientRect().width+parseFloat(getComputedStyle(el).columnGap||'0'):el.clientWidth;
  el.scrollBy({left:direction*distance,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 }
 if(!items.length&&!emptyMessage)return null;
 return <section id={id} className="tvplus-media-strip is-red redline-home-strip" aria-label={title}>
  <header className="redline-strip-head"><h2>{title}</h2><div className="redline-strip-actions">
   <Link prefetch={false} href={href} aria-label={'Tout voir · '+title}>Tout voir <ArrowRight size={16} aria-hidden="true"/></Link>
  </div></header>
  {items.length?<><div ref={track} id={trackId} className="tvplus-media-track redline-track" tabIndex={0} role="region" aria-label={'Défiler horizontalement : '+title}>
   {items.map(item=><RedLineCard key={item.id} item={item}/>)}
  </div>
  {items.length>1&&<div className="redline-strip-footer">
   <span className="redline-strip-hint">{position.previous||position.next?'Faites défiler pour découvrir les citations':'Les dernières citations'}</span>
   <div className="redline-strip-controls">
    <button type="button" aria-label="Citation précédente" aria-controls={trackId} disabled={!position.previous} onClick={()=>move(-1)}><ChevronLeft size={19}/></button>
    <button type="button" aria-label="Citation suivante" aria-controls={trackId} disabled={!position.next} onClick={()=>move(1)}><ChevronRight size={19}/></button>
   </div>
  </div>}</>:<p className="empty-state">{emptyMessage}</p>}
 </section>;
}
