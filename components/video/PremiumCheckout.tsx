'use client';
import {useEffect,useState,useRef} from 'react';
import Link from 'next/link';
type Plan={slug:string;name:string;amount:number;duration_minutes:number};
type Plans={enabled:boolean;mode:string;plans:Plan[]};
const money=(v:number)=>v.toLocaleString('fr-FR')+' FCFA';
function duration(n:number){return n%1440===0?n/1440+' jour(s)':n%60===0?n/60+' heure(s)':n+' minutes';}
export default function PremiumCheckout({authenticated,configured}:{authenticated:boolean;configured:boolean}){
 const [data,setData]=useState<Plans|null>(null),[slug,setSlug]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[confirmed,setConfirmed]=useState(false);
 const lock=useRef(false);
 useEffect(()=>{const c=new AbortController();fetch('/api/premium/plans',{signal:c.signal,cache:'no-store'}).then(async r=>{const b=await r.json();if(!r.ok||!b.success)throw Error('Offres momentanément indisponibles.');return b.data as Plans;}).then(v=>{setData(v);setSlug(v.plans[0]?.slug||'');}).catch(()=>{if(!c.signal.aborted)setError('Offres momentanément indisponibles.');});return()=>c.abort();},[]);
 const plan=data?.plans.find(p=>p.slug===slug);
 async function purchase(){if(lock.current||!plan||!confirmed||!data?.enabled||(!configured&&data?.mode!=='sandbox')||!authenticated)return;lock.current=true;setBusy(true);setError('');
 try{const r=await fetch('/api/premium/payment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'checkout',plan:slug,amount:plan.amount,durationMinutes:plan.duration_minutes,confirmed:true}),cache:'no-store'});const b=await r.json();if(!r.ok||!b.success)throw Error(b.error?.message||'Paiement indisponible.');
 if(b.data.url){window.location.assign(b.data.url);return;}
 if(b.data.reference){window.location.assign('/direct/paiement?reference='+encodeURIComponent(b.data.reference));return;}
 throw Error('Référence indisponible.');
 }catch(e){setError(e instanceof Error?e.message:'Paiement indisponible.');}finally{lock.current=false;setBusy(false);}
 }
 return <div className="premium-offers">
  {data?.mode==='sandbox'&&<p className="premium-info">Mode test — aucun accès réel n’est activé.</p>}
  {error&&<p role="alert" className="premium-error">{error}</p>}
  {!data&&!error&&<p>Chargement des offres…</p>}
  {data&&(!data.enabled||(!configured&&data.mode!=='sandbox')||!data.plans.length)&&<p>Les offres de paiement ne sont pas encore ouvertes.</p>}
  {!!data?.plans.length&&<fieldset><legend>Choisissez votre accès au direct</legend>{data.plans.map(p=><label className={'premium-option'+(slug===p.slug?' selected':'')} key={p.slug}><input type="radio" name="premium-plan" checked={slug===p.slug} onChange={()=>{setSlug(p.slug);setConfirmed(false);}}/><span><strong>{p.name}</strong><small>{duration(p.duration_minutes)}</small></span><b>{money(p.amount)}</b></label>)}</fieldset>}
  {!authenticated?<Link href="/connexion?next=/direct" className="premium-primary">Se connecter pour acheter</Link>:<>
  {plan&&data?.enabled&&(configured||data.mode==='sandbox')&&<><label className="premium-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Je confirme l’achat de {plan.name} à {money(plan.amount)}. Pas de renouvellement automatique.</label><button type="button" className="premium-primary" disabled={!confirmed||busy} onClick={()=>void purchase()}>{busy?'Préparation du paiement…':'Payer avec SingPay'}</button></>}
  <Link href="/direct/paiement" className="premium-secondary">Mes paiements et vérification</Link></>}
  <small>Paiement sur la page sécurisée de SingPay. Aucun code Mobile Money n’est demandé par TV+ Afrique.</small>
 </div>;
}