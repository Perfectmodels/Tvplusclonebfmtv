'use client';
import {useEffect,useState} from 'react';
import {Eye} from 'lucide-react';
export default function ArticleReadCounter({shortCode,initial}:{shortCode?:string;initial:number}){
 const [reads,setReads]=useState(initial);
 useEffect(()=>{
  if(!shortCode||!/^[A-Za-z0-9_-]{8}$/.test(shortCode))return;
  const day=new Date().toISOString().slice(0,10);
  const key='tvplus:article-read:'+shortCode+':'+day;
  try{if(window.localStorage.getItem(key))return;}catch{}
  let timer:number|undefined;
  let cancelled=false;
  const register=()=>{
   if(document.visibilityState==='hidden'||cancelled)return;
   try{if(window.localStorage.getItem(key))return;window.localStorage.setItem(key,'1');}catch{}
   void fetch('/api/article-reads',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({shortCode}),cache:'no-store',keepalive:true})
    .then(async res=>{if(!res.ok)throw new Error('Lecture non enregistrée');return res.json();})
    .then(body=>{if(!cancelled&&typeof body.reads==='number')setReads(body.reads);})
    .catch(()=>{try{window.localStorage.removeItem(key);}catch{}});
  };
  const update=()=>{
   if(timer!==undefined)window.clearTimeout(timer);
   if(document.visibilityState==='visible')timer=window.setTimeout(register,12000);
  };
  update();
  document.addEventListener('visibilitychange',update);
  return ()=>{cancelled=true;if(timer!==undefined)window.clearTimeout(timer);document.removeEventListener('visibilitychange',update);};
 },[shortCode]);
 return <span className="article-read-counter" aria-label={reads.toLocaleString('fr-FR')+' lectures enregistrées'}>
  <Eye size={16} aria-hidden="true"/> {reads.toLocaleString('fr-FR')} lecture{reads!==1?'s':''}
 </span>;
}
