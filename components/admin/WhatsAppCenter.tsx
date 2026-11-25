'use client';
import {useEffect,useState,useRef} from 'react';
import {MessageCircle,Users,Send,RefreshCw,ShieldCheck,History,Inbox} from 'lucide-react';
type Purpose='test'|'alert'|'newsletter'|'premium';
type Template={purpose:Purpose;name:string;language:string;label:string;parameters:string[]};
type Contact={phone:string;purpose:Purpose;granted:number|string;opted_out:number|string;updated_at:string};
type Message={id:string;phone:string;purpose:Purpose;template:string;state:string;provider_status:string;created_at:string};
type Incoming={phone:string;body:string;received_at:string};
type Overview={configured:boolean;enabled:boolean;botEnabled:boolean;sender:string;templates:Template[];contacts:Contact[];messages:Message[];inbound:Incoming[];stats:{state:string;count:number|string}[]};
const purposes:Record<Purpose,string>={test:'Test technique',alert:'Alertes info',newsletter:'Newsletter',premium:'Informations Premium'};
const states:Record<string,string>={reserved:'Réservé',accepted:'Accepté par Infobip',delivered:'Livré',read:'Lu',failed:'Échec',unknown:'À vérifier'};
const tabs=[['send','Envoyer',Send],['contacts','Contacts',Users],['history','Historique',History],['inbox','Réception',Inbox]] as const;
function date(v:string){const d=new Date(v.replace(' ','T')+(v.includes('Z')||/[+-][0-9]{2}:?[0-9]{2}$/.test(v)?'':'Z'));return Number.isFinite(d.valueOf())?new Intl.DateTimeFormat('fr-FR',{timeZone:'Africa/Libreville',dateStyle:'short',timeStyle:'short'}).format(d):v;}
async function api(action?:unknown){const response=await fetch('/api/admin-v2/whatsapp',action?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action),cache:'no-store'}:{cache:'no-store'});const json=await response.json();if(!response.ok||!json.success)throw Error(json.error?.message||'Service indisponible.');return json.data;}
export default function WhatsAppCenter(){
 const [data,setData]=useState<Overview|null>(null),[tab,setTab]=useState<string>('send'),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const [phone,setPhone]=useState(''),[purpose,setPurpose]=useState<Purpose>('alert'),[proof,setProof]=useState(''),[consent,setConsent]=useState(false);
 const [templateKey,setTemplateKey]=useState(''),[selected,setSelected]=useState<string[]>([]),[values,setValues]=useState<string[]>([]),[confirmed,setConfirmed]=useState(false);
 const pending=useRef<{signature:string;id:string}|null>(null);
 const lock=useRef(false);
 const key=(t:Template)=>t.purpose+'|'+t.name+'|'+t.language;
 const template=data?.templates.find(t=>key(t)===templateKey);
 const eligible=data?.contacts.filter(c=>c.purpose===template?.purpose&&Number(c.granted)===1&&Number(c.opted_out)===0)||[];
 const max=template?.purpose==='test'?1:5;
 async function reload(){const result:Overview=await api();setData(result);setTemplateKey(k=>k||key(result.templates[0]));}
 useEffect(()=>{reload().catch(e=>setError(e.message));},[]);
 async function run(fn:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');try{await fn();}catch(e){setError(e instanceof Error?e.message:'Opération impossible.');}finally{lock.current=false;setBusy(false);}}
 function choose(k:string){setTemplateKey(k);setSelected([]);setValues([]);setConfirmed(false);}
 function toggle(p:string){setSelected(s=>s.includes(p)?s.filter(x=>x!==p):s.length<max?[...s,p]:s);setConfirmed(false);}
 const ready=!!template&&selected.length>0&&selected.length<=max&&selected.every(p=>eligible.some(c=>c.phone===p))&&template.parameters.every((_,i)=>!!values[i]?.trim())&&confirmed&&!!data?.enabled&&!busy;
 async function send(){if(!template||!ready)return;await run(async()=>{
  const payload={action:'send',template:template.name,language:template.language,purpose:template.purpose,phones:[...selected].sort(),values:template.parameters.map((_,i)=>values[i].trim()),confirmed:true};
  const signature=JSON.stringify(payload);
  if(pending.current?.signature!==signature)pending.current={signature,id:crypto.randomUUID()};
  const result=await api({...payload,requestId:pending.current.id});
  setConfirmed(false);setSelected([]);setNotice(result.duplicate?'Demande déjà traitée. Aucun nouvel envoi.':'Demande traitée. Consultez les statuts dans l’historique.');pending.current=null;await reload();
 });}
 return <div className="wa-center">
  <header className="wa-head"><div><p>COMMUNICATION · TV+ AFRIQUE</p><h1><MessageCircle size={28}/> Centre WhatsApp</h1><span>Infobip · Alertes, newsletters et notifications aux abonnés.</span></div><button className="admin-btn admin-btn-ghost" disabled={busy} onClick={()=>void run(reload)}><RefreshCw size={16}/> Actualiser</button></header>
  <div className="wa-status"><ShieldCheck size={19}/><span>{!data?'Vérification de la configuration…':data.enabled?'Envois réels activés':data.configured?'Clé configurée — envois désactivés':'Configuration Infobip à compléter'}</span>{data&&<small>Expéditeur +{data.sender} · Robot {data.botEnabled?'activé':'désactivé'}</small>}</div>
  {error&&<p className="wa-error" role="alert">{error}</p>}{notice&&<p className="wa-notice" role="status">{notice}</p>}
  {data&&<>
   <div className="wa-metrics">{['accepted','delivered','read','failed'].map(s=><div key={s}><small>{states[s]}</small><strong>{Number(data.stats.find(x=>x.state===s)?.count||0).toLocaleString('fr-FR')}</strong></div>)}</div>
   <nav className="wa-tabs" aria-label="Centre WhatsApp">{tabs.map(([id,label,Icon])=><button type="button" key={id} aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)}><Icon size={17}/>{label}</button>)}</nav>
   {tab==='send'&&<div className="wa-columns"><section className="wa-card"><h2>Composer un envoi</h2><p>Les modèles sont configurés côté serveur après validation dans Infobip.</p><label>Modèle<select value={templateKey} onChange={e=>choose(e.target.value)}>{data.templates.map(t=><option key={key(t)} value={key(t)}>{t.label} · {t.language}</option>)}</select></label>
    {template?.parameters.map((label,i)=><label key={i}>{label}<input maxLength={250} value={values[i]||''} onChange={e=>{setValues(old=>{const next=[...old];next[i]=e.target.value;return next;});setConfirmed(false);}}/></label>)}
    {template?.purpose==='test'&&<small>Test limité à un destinataire. Ce modèle n’est pas destiné aux campagnes.</small>}
    <div className="wa-preview"><strong>Aperçu des paramètres</strong><p>{template?.label||'Aucun modèle'}</p>{template?.parameters.map((name,i)=><div key={i}>{name} : {values[i]||'—'}</div>)}<small>Le texte exact est celui du modèle approuvé dans Infobip.</small></div>
    <label className="wa-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Je confirme les destinataires, le modèle et l’envoi réel, qui peut être facturé.</label>
    <button className="admin-btn admin-btn-primary" disabled={!ready} onClick={()=>void send()}><Send size={16}/> {busy?'Traitement…':'Envoyer à '+selected.length+' contact(s)'}</button>
   </section><section className="wa-card"><h2>Destinataires autorisés</h2><p>{selected.length}/{max} sélectionnés · consentement par usage.</p>{!eligible.length?<p>Aucun contact autorisé pour ce modèle.</p>:eligible.map(c=><label className="wa-check" key={c.phone}><input type="checkbox" checked={selected.includes(c.phone)} disabled={busy||(!selected.includes(c.phone)&&selected.length>=max)} onChange={()=>toggle(c.phone)}/><span>+{c.phone}</span></label>)}</section></div>}
   {tab==='contacts'&&<div className="wa-columns"><section className="wa-card"><h2>Enregistrer un consentement</h2><form onSubmit={e=>{e.preventDefault();void run(async()=>{await api({action:'consent',phone,purpose,proof,confirmed:consent});setPhone('');setProof('');setConsent(false);setNotice('Consentement enregistré.');await reload();});}}><label>Numéro international<input type="tel" placeholder="+241…" required value={phone} onChange={e=>setPhone(e.target.value)}/></label><label>Finalité<select value={purpose} onChange={e=>setPurpose(e.target.value as Purpose)}>{Object.entries(purposes).map(([p,l])=><option key={p} value={p}>{l}</option>)}</select></label><label>Preuve et date de l’accord<textarea required minLength={10} maxLength={250} value={proof} onChange={e=>setProof(e.target.value)} placeholder="Référence de l’inscription ou accord explicite…"/></label><label className="wa-check"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/> Le destinataire a effectivement accepté cet usage.</label><button className="admin-btn admin-btn-primary" disabled={busy||!consent}>Enregistrer</button></form></section><section className="wa-card"><h2>Contacts enregistrés</h2>{data.contacts.length===0&&<p>Aucun contact enregistré.</p>}{data.contacts.map(c=><div className="wa-row" key={c.phone+c.purpose}><div><strong>+{c.phone}</strong><small>{purposes[c.purpose]} · {Number(c.opted_out)?'Désinscrit':Number(c.granted)?'Autorisé':'Retiré'}</small></div>{Number(c.granted)===1&&!Number(c.opted_out)&&<button className="admin-btn admin-btn-ghost" disabled={busy} onClick={()=>void run(async()=>{await api({action:'revoke',phone:c.phone,purpose:c.purpose});setNotice('Consentement retiré.');await reload();})}>Retirer</button>}</div>)}</section></div>}
   {tab==='history'&&<section className="wa-card"><h2>Historique des envois</h2><p>Derniers 100 messages. Les statuts de livraison sont actualisés par webhook.</p>{!data.messages.length&&<p>Aucun envoi enregistré.</p>}{data.messages.map(m=><div className="wa-row" key={m.id}><div><strong>+{m.phone} · {purposes[m.purpose]}</strong><small>{m.template} · {date(m.created_at)}</small></div><div className="wa-state"><strong>{states[m.state]||m.state}</strong><small>{m.provider_status}</small></div></div>)}</section>}
   {tab==='inbox'&&<section className="wa-card"><h2>Messages reçus</h2><p>Derniers 50 messages textuels reçus via le webhook authentifié.</p>{!data.inbound.length&&<p>Aucun message reçu.</p>}{data.inbound.map((m,i)=><div className="wa-row" key={m.phone+m.received_at+i}><div><strong>+{m.phone}</strong><small>{date(m.received_at)}</small><p>{m.body}</p></div></div>)}</section>}
  </>}
 </div>;
}
