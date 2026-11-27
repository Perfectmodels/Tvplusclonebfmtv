'use client';
import {useEffect,useRef,useId} from 'react';
import {AlertTriangle,LoaderCircle} from 'lucide-react';
export default function ConfirmDialog({open,title,message,confirmLabel='Confirmer',loading=false,onConfirm,onCancel}:{open:boolean;title:string;message:string;confirmLabel?:string;loading?:boolean;onConfirm:()=>void;onCancel:()=>void}){
 const ref=useRef<HTMLDialogElement>(null),id=useId();
 useEffect(()=>{const dialog=ref.current;if(!dialog)return;if(open&&!dialog.open)dialog.showModal();if(!open&&dialog.open)dialog.close();},[open]);
 return <dialog ref={ref} className="tv-confirm" aria-labelledby={id+'-title'} aria-describedby={id+'-message'} onCancel={e=>{e.preventDefault();if(!loading)onCancel();}}><div className="tv-confirm-inner"><div className="tv-confirm-symbol"><AlertTriangle size={26}/></div><h2 id={id+'-title'}>{title}</h2><p id={id+'-message'}>{message}</p><div className="tv-confirm-actions"><button type="button" autoFocus onClick={onCancel} disabled={loading}>Annuler</button><button type="button" className="tv-confirm-danger" onClick={onConfirm} disabled={loading}>{loading&&<LoaderCircle size={16} className="tv-spin"/>}{loading?'Traitement…':confirmLabel}</button></div></div></dialog>;
}
