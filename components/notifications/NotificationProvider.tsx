'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {AlertTriangle,CheckCircle2,Info,X,RefreshCw,Bell,Radio} from 'lucide-react';
import {usePathname,useRouter} from 'next/navigation';
import {createClient} from '@supabase/supabase-js';
import './notifications.css';

type Kind='success'|'error'|'info'|'warning';
type Notice={id:number;kind:Kind;message:string;at:number;href?:string};
type ConfirmOptions={title?:string;label?:string;danger?:boolean};
type Request={message:string;options:ConfirmOptions;resolve:(value:boolean)=>void};
type Api={success:(message:string)=>void;error:(message:string)=>void;info:(message:string)=>void;warning:(message:string)=>void;confirm:(message:string,options?:ConfirmOptions)=>Promise<boolean>;notices:Notice[];unread:number;markRead:()=>void;connected:boolean;enabled:boolean;refresh:()=>void};
const Context=createContext<Api|null>(null);
export function useNotifications(){const ctx=useContext(Context);if(!ctx)throw Error('NotificationProvider manquant');return ctx;}
export function useResultNotifications(success:string,error:string){
 const api=useNotifications(),last=useRef({success:'',error:''});
 useEffect(()=>{const prev=last.current;last.current={success,error};if(success&&success!==prev.success)api.success(success);if(error&&error!==prev.error)api.error(error);},[success,error,api]);
}
const labels:Record<string,{message:string;href:string}>={articles:{message:'L’actualité TV+ Afrique a été mise à jour.',href:'/actualites'},media:{message:'Le catalogue audiovisuel a été mis à jour.',href:'/videos'},replays:{message:'Le catalogue des replays a été mis à jour.',href:'/replays'}};
const icons={success:CheckCircle2,error:AlertTriangle,warning:AlertTriangle,info:Info};
export default function NotificationProvider({children,url,publicKey}:{children:ReactNode;url?:string;publicKey?:string}){
 const pathname=usePathname(),router=useRouter(),[notices,setNotices]=useState<Notice[]>([]),[toasts,setToasts]=useState<Notice[]>([]),[unread,setUnread]=useState(0),[connected,setConnected]=useState(false),[request,setRequest]=useState<Request|null>(null);
 const serial=useRef(0),active=useRef<Request|null>(null),dialog=useRef<HTMLDialogElement>(null),timers=useRef(new Map<number,ReturnType<typeof setTimeout>>()),seen=useRef(new Map<string,number>());
 const enabled=!!url&&!!publicKey&&publicKey.startsWith('sb_publishable_')&&!/^\/(connexion|inscription|mot-de-passe-oublie|reinitialiser-mot-de-passe)(\/|$)/.test(pathname);
 const push=useCallback((kind:Kind,message:string,href?:string)=>{
  const n={id:++serial.current,kind,message:message.slice(0,500),at:Date.now(),href};
  setNotices(old=>[n,...old].slice(0,30));setUnread(n=>Math.min(30,n+1));setToasts(old=>[...old.slice(-3),n]);
  const timer=setTimeout(()=>{setToasts(old=>old.filter(t=>t.id!==n.id));timers.current.delete(n.id);},kind==='error'?9000:6000);timers.current.set(n.id,timer);
 },[]);
 const closeToast=useCallback((id:number)=>{const t=timers.current.get(id);if(t)clearTimeout(t);timers.current.delete(id);setToasts(old=>old.filter(n=>n.id!==id));},[]);
 const finish=useCallback((value:boolean)=>{const current=active.current;active.current=null;setRequest(null);if(dialog.current?.open)dialog.current.close();current?.resolve(value);},[]);
 const confirm=useCallback((message:string,options:ConfirmOptions={})=>new Promise<boolean>(resolve=>{
  if(active.current){resolve(false);return;}const req={message,options,resolve};active.current=req;setRequest(req);
 }),[]);
 useEffect(()=>{if(request&&!dialog.current?.open)dialog.current?.showModal();},[request]);
 useEffect(()=>{finish(false);},[pathname,finish]);
 useEffect(()=>()=>{timers.current.forEach(t=>clearTimeout(t));active.current?.resolve(false);},[]);
 useEffect(()=>{
  if(!enabled||!url||!publicKey){setConnected(false);return;}
  const client=createClient(url,publicKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  let disposed=false,channel:ReturnType<typeof client.channel>|null=null;
  const pending=new Set<string>();let timer:ReturnType<typeof setTimeout>|undefined;
  const ingest=(row:unknown)=>{
   if(!row||typeof row!=='object'||!('topic' in row)||!('revision' in row)||typeof row.topic!=='string')return;
   const topic=row.topic,rev=Number(row.revision);if(!labels[topic]||!Number.isSafeInteger(rev))return;
   const previous=seen.current.get(topic);if(previous!==undefined&&rev<=previous)return;seen.current.set(topic,rev);
   if(previous===undefined)return;
   pending.add(topic);if(timer)clearTimeout(timer);
   timer=setTimeout(()=>{for(const key of pending){const item=labels[key];push('info',item.message,item.href);}pending.clear();},1200);
  };
  async function baseline(){const {data,error}=await client.from('tvplus_public_signals').select('topic,revision');if(!disposed&&!error)data?.forEach(ingest);}
  function start(){if(disposed||channel||document.visibilityState!=='visible')return;
   channel=client.channel('tvplus-public-signals').on('postgres_changes',{event:'UPDATE',schema:'public',table:'tvplus_public_signals'},payload=>ingest(payload.new)).subscribe(status=>{if(disposed)return;setConnected(status==='SUBSCRIBED');if(status==='SUBSCRIBED')void baseline();});
  }
  function stop(){const current=channel;channel=null;setConnected(false);if(current)void client.removeChannel(current);}
  const visibility=()=>document.visibilityState==='visible'?start():stop();
  document.addEventListener('visibilitychange',visibility);start();
  return()=>{disposed=true;document.removeEventListener('visibilitychange',visibility);if(timer)clearTimeout(timer);if(channel)void client.removeChannel(channel);};
 },[url,publicKey,enabled,push]);
 const api=useMemo<Api>(()=>({success:m=>push('success',m),error:m=>push('error',m),info:m=>push('info',m),warning:m=>push('warning',m),confirm,notices,unread,markRead:()=>setUnread(0),connected,enabled,refresh:()=>router.refresh()}),[push,confirm,notices,unread,connected,enabled,router]);
 return <Context.Provider value={api}>{children}<div className="tv-notice-stack" aria-live="polite" aria-relevant="additions">{toasts.map(n=>{const Icon=icons[n.kind];return <div key={n.id} className={'tv-notice tv-notice-'+n.kind} role={n.kind==='error'?'alert':'status'}><div className="tv-notice-icon"><Icon size={21}/></div><div className="tv-notice-copy"><strong>{({success:'Opération réussie',error:'Une erreur est survenue',warning:'Attention',info:'TV+ Afrique · En direct'})[n.kind]}</strong><span>{n.message}</span>{n.href&&<a href={n.href}>Voir les mises à jour</a>}</div><button type="button" onClick={()=>closeToast(n.id)} aria-label="Fermer"><X size={17}/></button></div>})}</div>
 <dialog ref={dialog} className="tv-confirm" onCancel={e=>{e.preventDefault();finish(false);}} onClose={()=>{if(active.current)finish(false);}} aria-labelledby="tv-confirm-title" aria-describedby="tv-confirm-message"><div className="tv-confirm-inner"><div className="tv-confirm-symbol"><AlertTriangle size={26}/></div><h2 id="tv-confirm-title">{request?.options.title??'Confirmer cette action'}</h2><p id="tv-confirm-message">{request?.message}</p><div className="tv-confirm-actions"><button type="button" autoFocus onClick={()=>finish(false)}>Annuler</button><button className={request?.options.danger?'tv-confirm-danger':'tv-confirm-primary'} type="button" onClick={()=>finish(true)}>{request?.options.label??'Confirmer'}</button></div></div></dialog>
 </Context.Provider>;
}

export function NotificationBell(){const api=useNotifications(),[open,setOpen]=useState(false);const ref=useRef<HTMLDivElement>(null);useEffect(()=>{if(!open)return;const close=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false);};const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};document.addEventListener('mousedown',close);document.addEventListener('keydown',key);return()=>{document.removeEventListener('mousedown',close);document.removeEventListener('keydown',key);};},[open]);
 return <div className="tv-notification-bell" ref={ref}><button type="button" aria-label={'Notifications'+(api.unread?' ('+api.unread+')':'')} aria-expanded={open} className="tv-bell-button" onClick={()=>{setOpen(v=>!v);api.markRead();}}><Bell size={20}/>{api.unread>0&&<span>{api.unread>9?'9+':api.unread}</span>}</button>{open&&<section className="tv-notification-panel" aria-label="Notifications"><header><div><strong>Notifications</strong><small><Radio size={12}/>{api.connected?'Connecté en temps réel':api.enabled?'Connexion en cours / hors ligne':'Notifications locales'}</small></div><button type="button" onClick={()=>setOpen(false)} aria-label="Fermer"><X size={18}/></button></header><div className="tv-notification-list">{!api.notices.length?<p>Aucune notification pour cette session.</p>:api.notices.map(n=>{const Icon=icons[n.kind];return <article key={n.id}><Icon size={18}/><div><span>{n.message}</span><small>{new Date(n.at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Libreville'})}</small>{n.href&&<a href={n.href}>Consulter</a>}</div></article>})}</div><footer><button type="button" onClick={()=>{api.refresh();setOpen(false);}}><RefreshCw size={14}/> Actualiser la page</button></footer></section>}</div>;
}
