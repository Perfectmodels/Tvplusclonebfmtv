'use client';

import {useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {ArrowUpRight,Send,X,RotateCcw,Search,ChevronRight,GripHorizontal} from 'lucide-react';
import RobotAvatar from './RobotAvatar';
import {useFloatingChat} from './useFloatingChat';

type Result={answer:string;links:{href:string;title:string}[]};
type Message={id:number;question:string;result?:Result;error?:string;pending?:boolean};
const suggestions=['Dernières actualités','Les émissions et replays','Le direct'];
const safeLink=(href:string)=>href.startsWith('/')&&!href.startsWith('//')&&!href.includes('\\');
export default function PublicAssistant(){
 const pathname=usePathname();
 const [open,setOpen]=useState(false),[question,setQuestion]=useState(''),[messages,setMessages]=useState<Message[]>([]),[busy,setBusy]=useState(false),[greeting,setGreeting]=useState(false);
 const input=useRef<HTMLInputElement>(null),launcher=useRef<HTMLButtonElement>(null),pending=useRef<AbortController|null>(null),results=useRef<HTMLDivElement>(null),nextId=useRef(0);
 useEffect(()=>{setOpen(pathname==='/recherche'&&new URLSearchParams(window.location.search).get('assistant')==='1');},[pathname]);
 useEffect(()=>{if(open&&window.matchMedia('(pointer:fine)').matches)input.current?.focus();},[open]);
 useEffect(()=>()=>pending.current?.abort(),[]);
 useEffect(()=>{if(open&&results.current)results.current.scrollTop=results.current.scrollHeight;},[messages,open,greeting]);
 const floating=useFloatingChat(open);
 const last=messages[messages.length-1];
 const mood=busy?'thinking':last?.error?'error':last?.result?'answer':'idle';
 function close(){setOpen(false);requestAnimationFrame(()=>launcher.current?.focus());}
 function reset(){pending.current?.abort();pending.current=null;setBusy(false);setMessages([]);setQuestion('');setGreeting(false);input.current?.focus();}
 async function search(value:string){
  const query=value.trim();if(query.length<3||pending.current)return;
  const id=++nextId.current,controller=new AbortController();pending.current=controller;
  setBusy(true);setQuestion('');setGreeting(false);
  setMessages(old=>[...old.slice(-19),{id,question:query,pending:true}]);
  const update=(patch:Partial<Message>)=>setMessages(old=>old.map(m=>m.id===id?{...m,...patch,pending:false}:m));
  try{
   const response=await fetch('/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:query}),signal:controller.signal});
   const body=await response.json();if(!response.ok)throw new Error(body.error?.message??'La recherche est momentanément indisponible.');
   if(!body.data||typeof body.data.answer!=='string'||!Array.isArray(body.data.links))throw new Error('Réponse indisponible.');
   const result:Result={answer:body.data.answer,links:body.data.links.filter((x:unknown):x is Result['links'][number]=>!!x&&typeof x==='object'&&'href' in x&&'title' in x&&typeof x.href==='string'&&typeof x.title==='string'&&safeLink(x.href))};
   if(!controller.signal.aborted)update({result});
  }catch(reason){if(!controller.signal.aborted)update({error:reason instanceof Error?reason.message:'La recherche est momentanément indisponible.'});}
  finally{if(pending.current===controller){pending.current=null;setBusy(false);}}
 }
 return <div ref={floating.root} className={'tv-chat'+(open?' is-open':'')+(floating.dragging?' is-dragging':'')}>
  {open?<section id="tv-chat-panel" className="tv-chat-panel" role="dialog" aria-label="Recherche conversationnelle TV+ Afrique" onKeyDown={event=>{if(event.key==='Escape')close();}}>
   <header className="tv-chat-header">
    <button type="button" className="tv-chat-header-mark tv-chat-drag-handle" {...floating.dragHandle} aria-label="Déplacer le chat. Utilisez les flèches du clavier ou faites glisser." title="Faire glisser pour déplacer"><GripHorizontal size={18} aria-hidden="true"/><span><strong>Recherche d’articles</strong><small aria-live="polite">{busy?'Recherche en cours…':'À votre écoute'}</small></span></button>
    <div className="tv-chat-actions"><button type="button" onClick={reset} aria-label="Nouvelle conversation" title="Nouvelle conversation"><RotateCcw size={17}/></button><button type="button" onClick={close} aria-label="Fermer le chat" title="Fermer"><X size={21}/></button></div>
   </header>
   <div className="tv-chat-robotbar">
     <RobotAvatar interactive mood={mood} onGreet={()=>setGreeting(true)}/>
     <div className="tv-chat-intro"><strong>{busy?'Je recherche pour vous…':last?.result?'Voici les informations trouvées.':last?.error?'Réessayons ensemble.':'Bonjour !'}</strong><small>{busy?'Je parcours les articles publiés.':'Un sujet, un nom, un lieu ?'}</small></div>
   </div>
   <div ref={results} className="tv-chat-results" aria-live="polite" aria-relevant="additions text" role="log">
    {!messages.length&&<><div className="tv-chat-message">Je peux vous aider à retrouver une actualité, une émission ou un article publié sur TV+ Afrique.</div><div className="tv-chat-suggestions" aria-label="Suggestions">{suggestions.map(s=><button key={s} type="button" disabled={busy} onClick={()=>void search(s)}>{s}<ChevronRight size={14}/></button>)}</div></>}
    {messages.map(m=><div key={m.id} className="tv-chat-turn">
     <div className="tv-chat-user">{m.question}</div>
     {m.pending?<div className="tv-chat-message tv-chat-typing"><Search size={14}/><span>Recherche</span><i/><i/><i/></div>:m.error?<div className="tv-chat-message"><p>{m.error}</p><button className="tv-chat-retry" type="button" disabled={busy} onClick={()=>void search(m.question)}>Réessayer</button></div>:m.result?<div className="tv-chat-message"><p>{m.result.answer}</p>{m.result.links.length?<ul>{m.result.links.map(link=><li key={link.href}><Link href={link.href} onClick={close}>{link.title}<ArrowUpRight size={14}/></Link></li>)}</ul>:<Link className="tv-chat-retry" href={'/recherche?q='+encodeURIComponent(m.question)} onClick={close}>Ouvrir la recherche du site</Link>}</div>:null}
    </div>)}
    {greeting&&<div className="tv-chat-message">Je suis là ! Posez-moi votre question.</div>}
   </div>
   <form className="tv-chat-form" onSubmit={event=>{event.preventDefault();void search(question);}}>
    <input ref={input} aria-label="Votre question" placeholder="Rechercher une actualité…" maxLength={240} value={question} onChange={event=>setQuestion(event.target.value)}/>
    <button type="submit" className="tv-chat-send" aria-label="Envoyer" disabled={busy||question.trim().length<3}><Send size={18}/></button>
   </form>
   <footer className="tv-chat-note">Recherche basée sur les publications de TV+ Afrique.</footer>
  </section>:<button ref={launcher} type="button" className="tv-chat-launch tv-chat-drag-handle" {...floating.dragHandle} onClick={event=>{if(floating.allowLaunch(event.detail))setOpen(true);}} aria-label="Ouvrir ou déplacer la recherche conversationnelle" title="Cliquer pour ouvrir, faire glisser pour déplacer" aria-expanded={false} aria-controls="tv-chat-panel"><RobotAvatar/><span className="tv-chat-launch-dot" aria-hidden="true"/></button>}
 </div>;
}
