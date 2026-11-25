'use client';
import {useCallback,useEffect,useLayoutEffect,useRef,useState,type PointerEvent,type KeyboardEvent} from 'react';

type Position={x:number;y:number};
type Bounds={left:number;top:number;spanX:number;spanY:number};
const KEY='tvplus.chat.position.v1';
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const DEFAULT:Position={x:1,y:1};
function saved():Position{
 try{const v=JSON.parse(localStorage.getItem(KEY)||'null');if(v&&Number.isFinite(v.x)&&Number.isFinite(v.y))return {x:clamp(v.x),y:clamp(v.y)};}catch{}
 return DEFAULT;
}
export function useFloatingChat(open:boolean){
 const root=useRef<HTMLDivElement>(null);
 const position=useRef<Position>(DEFAULT);
 const initialized=useRef(false);
 const suppressClick=useRef(false);
 const active=useRef<{id:number;startX:number;startY:number;left:number;top:number;moved:boolean;target:HTMLElement}|null>(null);
 const [dragging,setDragging]=useState(false);
 const bounds=useCallback(():Bounds=>{
  const viewport=window.visualViewport;
  const width=viewport?.width??window.innerWidth,height=viewport?.height??window.innerHeight;
  const left=(viewport?.offsetLeft??0)+12,top=(viewport?.offsetTop??0)+12;
  const node=root.current;
  return {left,top,spanX:Math.max(0,width-24-(node?.offsetWidth??0)),spanY:Math.max(0,height-24-(node?.offsetHeight??0))};
 },[]);
 const apply=useCallback(()=>{
  const node=root.current;if(!node)return;
  const viewport=window.visualViewport;
  node.style.setProperty('--tv-chat-available-height',Math.max(0,(viewport?.height??window.innerHeight)-24)+'px');
  node.style.setProperty('--tv-chat-available-width',Math.max(0,(viewport?.width??window.innerWidth)-24)+'px');
  const b=bounds();
  node.style.left=Math.round(b.left+position.current.x*b.spanX)+'px';
  node.style.top=Math.round(b.top+position.current.y*b.spanY)+'px';
  node.style.right='auto';node.style.bottom='auto';
 },[bounds]);
 const persist=useCallback(()=>{try{localStorage.setItem(KEY,JSON.stringify(position.current));}catch{}},[]);
 useLayoutEffect(()=>{
  if(!initialized.current){position.current=saved();initialized.current=true;}
  apply();
  const node=root.current;
  const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(apply);
  if(node)observer?.observe(node);
  window.addEventListener('resize',apply);
  const viewport=window.visualViewport;
  viewport?.addEventListener('resize',apply);viewport?.addEventListener('scroll',apply);
  return()=>{observer?.disconnect();window.removeEventListener('resize',apply);viewport?.removeEventListener('resize',apply);viewport?.removeEventListener('scroll',apply);};
 },[open,apply]);
 useEffect(()=>()=>{active.current=null;},[]);
 function moveTo(left:number,top:number){
  const b=bounds();
  position.current={x:b.spanX?clamp((left-b.left)/b.spanX):position.current.x,y:b.spanY?clamp((top-b.top)/b.spanY):position.current.y};
  apply();
 }
 function onPointerDown(e:PointerEvent<HTMLElement>){
  if(!e.isPrimary||e.button!==0||active.current)return;
  const node=root.current;if(!node)return;
  suppressClick.current=false;
  const r=node.getBoundingClientRect();
  active.current={id:e.pointerId,startX:e.clientX,startY:e.clientY,left:r.left,top:r.top,moved:false,target:e.currentTarget};
  e.currentTarget.setPointerCapture(e.pointerId);
 }
 function onPointerMove(e:PointerEvent<HTMLElement>){
  const a=active.current;if(!a||a.id!==e.pointerId)return;
  const dx=e.clientX-a.startX,dy=e.clientY-a.startY;
  if(!a.moved&&Math.hypot(dx,dy)<6)return;
  if(!a.moved){a.moved=true;suppressClick.current=true;setDragging(true);}
  moveTo(a.left+dx,a.top+dy);e.preventDefault();
 }
 function finish(e:PointerEvent<HTMLElement>){
  const a=active.current;if(!a||a.id!==e.pointerId)return;
  active.current=null;setDragging(false);
  if(a.target.hasPointerCapture(e.pointerId))a.target.releasePointerCapture(e.pointerId);
  if(a.moved)persist();
 }
 function onKeyDown(e:KeyboardEvent<HTMLElement>){
  const directions:Record<string,[number,number]>={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  const d=directions[e.key];if(!d&&e.key!=='Home')return;
  e.preventDefault();
  if(e.key==='Home'){position.current=DEFAULT;apply();persist();return;}
  const r=root.current?.getBoundingClientRect();if(!r||!d)return;
  const step=e.shiftKey?8:32;moveTo(r.left+d[0]*step,r.top+d[1]*step);persist();
 }
 function allowLaunch(detail:number){if(detail===0){suppressClick.current=false;return true;}const blocked=suppressClick.current;suppressClick.current=false;return !blocked;}
 return {root,dragging,allowLaunch,dragHandle:{onPointerDown,onPointerMove,onPointerUp:finish,onPointerCancel:finish,onLostPointerCapture:finish,onKeyDown}};
}
