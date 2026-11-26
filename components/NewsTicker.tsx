'use client';
import {useEffect,useState} from 'react';
type AlertItem={id:string;time:string;title:string};
export default function NewsTicker({items,variant='full',limit=20}:{items:AlertItem[];variant?:'full'|'rail';limit?:number}){
 const [alerts,setAlerts]=useState(items);
 useEffect(()=>{let active=true;const controller=new AbortController();async function refresh(){if(document.hidden)return;try{const r=await fetch('/api/public/alerts',{signal:controller.signal});if(r.ok){const data=await r.json();if(active&&Array.isArray(data.items)&&data.items.length)setAlerts(data.items);}}catch{}}
 const timer=setInterval(refresh,120000);return()=>{active=false;clearInterval(timer);controller.abort();};},[]);
 if(!alerts.length)return null;
 return <section className={'tvplus-alert-feed '+(variant==='rail'?' is-rail':'')} aria-label="News 24, flux en continu"><header><span className="news-ticker-pulse" aria-hidden="true"/> <strong>NEWS 24</strong><small>EN CONTINU</small></header><div className="tvplus-alert-feed-list" role="region" tabIndex={0} aria-label="Défiler les informations">{alerts.slice(0,limit).map(item=><div key={item.id} className="tvplus-alert-feed-item"><span>{item.time}</span><strong>{item.title}</strong></div>)}</div></section>;
}
