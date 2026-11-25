'use client';
import {useEffect,useState} from 'react';
export default function DirectLiveStage(){
 const [source,setSource]=useState<{embedUrl:string;expiresAt:string}|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 async function connect(){try{const res=await fetch('/api/live-stream',{cache:'no-store',signal:controller.signal});const body=await res.json();if(!res.ok)throw Error('Accès au direct indisponible. Vérifiez votre abonnement.');if(!controller.signal.aborted){setSource(body.data);setError('');const delay=Math.max(1000,Date.parse(body.data.expiresAt)-Date.now());timer=setTimeout(()=>{setSource(null);setError('Session de lecture expirée. Relancez le direct.');},delay);}}catch(e){if(!controller.signal.aborted){setSource(null);setError(e instanceof Error?e.message:'Lecteur indisponible.');}}}
 void connect();return()=>{controller.abort();if(timer)clearTimeout(timer);};
 },[retry]);
 return <div className="direct-live-stage">{source?<iframe title="TV+ Afrique en direct" src={source.embedUrl} style={{width:'100%',aspectRatio:'16/9',border:0}} allow="autoplay; encrypted-media; fullscreen" allowFullScreen referrerPolicy="no-referrer"/>:<div className="tvplus-premium-gate"><p role="status">{error||'Vérification de votre accès…'}</p>{error&&<button type="button" onClick={()=>{setError('');setRetry(n=>n+1)}}>Relancer le direct</button>}</div>}</div>;
}
