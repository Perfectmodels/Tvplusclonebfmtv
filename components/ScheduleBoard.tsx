'use client';
import {useState} from 'react';
export type ScheduleItem={weekday?:number;time:string;title:string;category:string;live:boolean};
const DAYS=[{id:1,label:'Lundi'},{id:2,label:'Mardi'},{id:3,label:'Mercredi'},{id:4,label:'Jeudi'},{id:5,label:'Vendredi'},{id:6,label:'Samedi'},{id:7,label:'Dimanche'}];
export default function ScheduleBoard({items}:{items:ScheduleItem[]}){
 const [day,setDay]=useState(()=>{const label=new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:'Africa/Libreville'}).format(new Date());return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(label)+1;});
 const dated=items.some(i=>i.weekday!=null);
 const visible=items.filter(i=>!dated||i.weekday===day||(day===7&&i.weekday===0)).sort((a,b)=>a.time.localeCompare(b.time));
 if(!items.length)return <p className="empty-state">Aucun horaire n’a encore été renseigné.</p>;
 return <section aria-label="Grille des programmes TV+ Afrique">{dated?<nav className="tvplus-schedule-days" aria-label="Jour de diffusion">{DAYS.map(d=><button key={d.id} type="button" aria-pressed={d.id===day} onClick={()=>setDay(d.id)}>{d.label}</button>)}</nav>:<p>Les jours de diffusion ne sont pas renseignés.</p>}
 {visible.length?<div className="schedule">{visible.map((slot,i)=><div className="schedule-row" key={slot.time+slot.title+i}><span className="schedule-time">{slot.time}</span><span className="schedule-body"><span className="fil-category">{slot.category}</span><strong>{slot.title}</strong></span></div>)}</div>:<p className="empty-state">Aucun programme renseigné pour ce jour.</p>}</section>;
}
