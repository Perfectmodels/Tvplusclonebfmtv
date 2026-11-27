'use client';
import {AlertCircle,CheckCircle2,Inbox,LoaderCircle,RefreshCw} from 'lucide-react';
import type {ReactNode} from 'react';
export function FeedbackState({kind,title,message,action,actionLabel='Réessayer',children}:{kind:'loading'|'empty'|'error'|'success';title:string;message?:string;action?:()=>void;actionLabel?:string;children?:ReactNode}){
 const Icon={loading:LoaderCircle,empty:Inbox,error:AlertCircle,success:CheckCircle2}[kind];
 return <section className={'tv-feedback-state tv-feedback-'+kind} role={kind==='error'?'alert':'status'} aria-busy={kind==='loading'}><div className="tv-feedback-icon"><Icon size={26} className={kind==='loading'?'tv-spin':undefined} aria-hidden="true"/></div><h2>{title}</h2>{message&&<p>{message}</p>}{action&&<button type="button" className="tv-feedback-button" onClick={action}>{kind==='error'&&<RefreshCw size={16}/>} {actionLabel}</button>}{children}</section>;
}
export function ListSkeleton({rows=5,label='Chargement des données'}:{rows?:number;label?:string}){return <div className="tv-list-skeleton" aria-busy="true" role="status"><span className="tv-sr-only">{label}</span>{Array.from({length:rows},(_,i)=><div key={i} aria-hidden="true"><i/><span><b/><b/><b/></span></div>)}</div>;}
