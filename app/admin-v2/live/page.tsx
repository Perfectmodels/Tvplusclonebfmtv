'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, CalendarClock, ExternalLink, MonitorPlay, Plus, RadioTower, RotateCcw, Save, Trash2 } from 'lucide-react';

type Channel={id:string;name:string;platform:string;watch_url:string;enabled:boolean;position:number;notes:string};
type Settings={title:string;description:string;standby_message:string;player_platform:string;playback_url:string;enabled:boolean;starts_at:string|null;ends_at:string|null};
const initial:Settings={title:'TV+ Afrique en direct',description:'',standby_message:'Le direct reprendra prochainement.',player_platform:'hls',playback_url:'',enabled:false,starts_at:null,ends_at:null};
const providers=[
 ['youtube','YouTube Live'],['facebook','Facebook Live'],['tiktok','TikTok Live'],
 ['twitch','Twitch'],['dailymotion','Dailymotion'],['vimeo','Vimeo'],
 ['restream','Restream'],['mux','Mux'],['cloudflare','Cloudflare Stream'],
 ['wowza','Wowza'],['castr','Castr'],['custom','Autre service']
];
const players=[['hls','HLS · .m3u8'],...providers.filter(p=>['youtube','facebook','tiktok','twitch','vimeo','dailymotion','custom'].includes(p[0]))];
const emptyChannel={name:'',platform:'youtube',watch_url:'',enabled:false,position:0,notes:''};
const local=(s:string|null)=>s?new Date(s).toLocaleString('sv-SE',{timeZone:'Africa/Libreville'}).replace(' ','T').slice(0,16):'';
const utc=(s:string)=>s?new Date(s+':00+01:00').toISOString():null;

export default function RegieDirect(){
 const [settings,setSettings]=useState<Settings>(initial);
 const [channels,setChannels]=useState<Channel[]>([]);
 const [editing,setEditing]=useState<string|null>(null);
 const [channel,setChannel]=useState(emptyChannel);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [error,setError]=useState(''),[message,setMessage]=useState('');
 const load=useCallback(async()=>{
  const [a,b]=await Promise.all([fetch('/api/admin-v2/live',{cache:'no-store'}),fetch('/api/admin-v2/live/channels',{cache:'no-store'})]);
  const [s,c]=await Promise.all([a.json(),b.json()]);
  if(!a.ok||!b.ok)throw Error(s.error?.message||c.error?.message||'Régie indisponible.');
  setSettings({...initial,...s.data});
  setChannels(c.data?.items||[]);
 },[]);
 useEffect(()=>{load().catch(e=>setError(e.message)).finally(()=>setLoading(false))},[load]);
 const field=<K extends keyof Settings>(key:K,v:Settings[K])=>{setSettings(s=>({...s,[key]:v}));setMessage('')};
 async function saveLive(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError('');setMessage('');
  try{
   const r=await fetch('/api/admin-v2/live',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(settings)});
   const v=await r.json();if(!r.ok)throw Error(v.error?.message||'Erreur de publication');
   setSettings({...initial,...v.data});setMessage('Réglages d’antenne enregistrés.');
  }catch(e){setError(e instanceof Error?e.message:'Réseau indisponible')}finally{setBusy(false)}
 }
 async function saveChannel(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError('');setMessage('');
  try{
   const r=await fetch('/api/admin-v2/live/channels',{method:editing?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...channel,...(editing?{id:editing}:{})})});
   const v=await r.json();if(!r.ok)throw Error(v.error?.message||'Destination invalide');
   setEditing(null);setChannel(emptyChannel);await load();setMessage('Destination de diffusion enregistrée.');
  }catch(e){setError(e instanceof Error?e.message:'Réseau indisponible')}finally{setBusy(false)}
 }
 async function remove(id:string){
  if(!window.confirm('Supprimer définitivement cette destination de la régie ?'))return;
  setBusy(true);try{
   const r=await fetch('/api/admin-v2/live/channels',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
   const v=await r.json();if(!r.ok)throw Error(v.error?.message||'Suppression impossible');
   await load();setMessage('Destination supprimée.');
  }catch(e){setError(e instanceof Error?e.message:'Erreur réseau')}finally{setBusy(false)}
 }
 const status=settings.enabled?'Lecteur public activé':'Lecteur public en veille';
 return <div className="v2-regie">
  <header className="v2-head"><div><p className="v2-newsroom-eyebrow">DIFFUSION · RÉGIE NUMÉRIQUE</p>
   <h1 className="v2-title">Régie du direct</h1>
   <p className="v2-lede">Pilotez le lecteur TV+, les créneaux d’antenne et les destinations de diffusion.</p></div>
   <Link className="admin-btn admin-btn-ghost" href="/direct" target="_blank"><ExternalLink size={16}/> Voir le direct public</Link>
  </header>
  <div className="v2-regie-summary">
   <div className="v2-card"><RadioTower size={23}/><p>État du lecteur</p><strong>{status}</strong></div>
   <div className="v2-card"><Activity size={23}/><p>Destinations configurées</p><strong>{channels.length} · {channels.filter(c=>c.enabled).length} actives</strong></div>
   <div className="v2-card"><CalendarClock size={23}/><p>Prochaine ouverture</p><strong>{settings.starts_at?new Date(settings.starts_at).toLocaleString('fr-GA',{timeZone:'Africa/Libreville'}):'À la demande'}</strong></div>
  </div>
  {error&&<div className="v2-error" role="alert">{error}</div>}
  {message&&<div className="v2-success" role="status">{message}</div>}
  {loading?<div className="v2-card">Chargement de la régie…</div>:<>
   <div className="v2-edit-grid">
    <section className="v2-card"><div className="v2-regie-section-head"><MonitorPlay size={20}/><h2 className="v2-panel-title">Lecteur TV+ Afrique</h2></div>
     <form onSubmit={saveLive}>
      <label className="v2-field"><span>Titre du direct *</span><input required minLength={3} maxLength={120} value={settings.title} onChange={e=>field('title',e.target.value)}/></label>
      <label className="v2-field"><span>Description éditoriale</span><textarea rows={3} maxLength={1200} value={settings.description} onChange={e=>field('description',e.target.value)}/></label>
      <label className="v2-field"><span>Source du lecteur</span><select value={settings.player_platform} onChange={e=>field('player_platform',e.target.value)}>{players.map(p=><option key={p[0]} value={p[0]}>{p[1]}</option>)}</select></label>
      <label className="v2-field"><span>URL publique de lecture {settings.player_platform==='hls'?'(.m3u8)':'(HTTPS)'}</span>
       <input type="url" maxLength={1400} placeholder="https://..." value={settings.playback_url} onChange={e=>field('playback_url',e.target.value)}/></label>
      <label className="v2-field"><span>Message lorsque le direct est indisponible</span><input maxLength={350} value={settings.standby_message} onChange={e=>field('standby_message',e.target.value)}/></label>
      <div className="v2-regie-times">
       <label className="v2-field"><span>Début d’affichage · Libreville</span><input type="datetime-local" value={local(settings.starts_at)} onChange={e=>field('starts_at',utc(e.target.value))}/></label>
       <label className="v2-field"><span>Fin d’affichage · Libreville</span><input type="datetime-local" value={local(settings.ends_at)} onChange={e=>field('ends_at',utc(e.target.value))}/></label>
      </div>
      <label className="v2-regie-check"><input type="checkbox" checked={settings.enabled} onChange={e=>field('enabled',e.target.checked)}/> Activer le lecteur public (la fenêtre horaire reste prioritaire)</label>
      <div className="v2-actions"><button className="admin-btn admin-btn-primary" type="submit" disabled={busy}><Save size={17}/> {busy?'Enregistrement…':'Enregistrer la régie'}</button></div>
     </form>
    </section>
    <aside className="v2-card">
     <h2 className="v2-panel-title">Aperçu et contrôle qualité</h2>
     <div className="v2-regie-preview">
      {settings.playback_url&&settings.player_platform==='hls'?<video src={settings.playback_url} controls playsInline preload="none" style={{width:'100%',aspectRatio:'16/9'}}/>:
       <div><MonitorPlay size={32}/><strong>{settings.title}</strong><p>{settings.playback_url?'Ouvrir le lecteur sur sa plateforme pour vérifier la lecture.':'Aucun flux public configuré.'}</p></div>}
     </div>
     {settings.playback_url&&<p><a href={settings.playback_url} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-ghost">Ouvrir la source <ExternalLink size={14}/></a></p>}
     <h3>Checklist avant antenne</h3>
     <ul className="v2-regie-checklist">
      <li>Définir la destination RTMPS et la clé dans OBS ou le prestataire.</li>
      <li>Vérifier le retour vidéo et le son dans le prestataire.</li>
      <li>Renseigner ici une URL publique HLS ou un lien de direct compatible.</li>
      <li>Activer le lecteur TV+ puis tester sur mobile et ordinateur.</li>
     </ul>
     <p className="v2-note">Ne jamais entrer de clé RTMP ou de jeton secret dans ces formulaires. Le site intègre le lecteur ; l’encodage et le multistream sont assurés par un service vidéo externe.</p>
    </aside>
   </div>
   <section className="v2-card"><div className="v2-regie-section-head"><RadioTower size={20}/><h2 className="v2-panel-title">Destinations de diffusion · {channels.length}</h2>
    <button type="button" className="admin-btn admin-btn-ghost" onClick={()=>void load().catch(e=>setError(e.message))}><RotateCcw size={16}/> Actualiser</button></div>
    <div className="v2-regie-channels">{channels.map(c=><div className="v2-regie-channel" key={c.id}>
     <div><strong>{c.name}</strong><span>{providers.find(x=>x[0]===c.platform)?.[1]||c.platform} · {c.enabled?'Lien actif':'En veille'}</span>
      {c.watch_url&&<a href={c.watch_url} target="_blank" rel="noopener noreferrer">Vérifier la destination <ExternalLink size={13}/></a>}
     </div><div className="v2-actions">
      <button type="button" className="admin-btn admin-btn-ghost" onClick={()=>{setEditing(c.id);setChannel({name:c.name,platform:c.platform,watch_url:c.watch_url,enabled:c.enabled,position:c.position,notes:c.notes})}}>Configurer</button>
      <button type="button" className="admin-btn admin-btn-ghost" disabled={busy} onClick={()=>void remove(c.id)} aria-label={'Supprimer '+c.name}><Trash2 size={15}/></button>
     </div></div>)}
     {!channels.length&&<p className="v2-note">Aucune destination. Ajoutez YouTube, Facebook, TikTok ou votre prestataire de diffusion.</p>}
    </div>
    <form onSubmit={saveChannel} className="v2-regie-channel-form">
     <h3>{editing?'Modifier la destination':'Ajouter une destination'}</h3>
     <div className="v2-regie-times">
      <label className="v2-field"><span>Nom *</span><input required minLength={2} maxLength={120} value={channel.name} onChange={e=>setChannel(c=>({...c,name:e.target.value}))}/></label>
      <label className="v2-field"><span>Diffuseur</span><select value={channel.platform} onChange={e=>setChannel(c=>({...c,platform:e.target.value}))}>{providers.map(p=><option key={p[0]} value={p[0]}>{p[1]}</option>)}</select></label>
     </div>
     <label className="v2-field"><span>Lien public vers la chaîne ou le direct (pas la clé d’émission)</span><input type="url" maxLength={1400} value={channel.watch_url} placeholder="https://..." onChange={e=>setChannel(c=>({...c,watch_url:e.target.value}))}/></label>
     <label className="v2-field"><span>Notes de régie</span><textarea maxLength={350} rows={2} value={channel.notes} onChange={e=>setChannel(c=>({...c,notes:e.target.value}))}/></label>
     <div className="v2-regie-times">
      <label className="v2-field"><span>Ordre d’affichage</span><input type="number" min={0} max={999} value={channel.position} onChange={e=>setChannel(c=>({...c,position:Number(e.target.value)}))}/></label>
      <label className="v2-regie-check"><input type="checkbox" checked={channel.enabled} onChange={e=>setChannel(c=>({...c,enabled:e.target.checked}))}/> Destination active</label>
     </div>
     <div className="v2-actions"><button className="admin-btn admin-btn-primary" disabled={busy} type="submit"><Plus size={16}/>{editing?'Mettre à jour':'Ajouter le diffuseur'}</button>
      {editing&&<button className="admin-btn admin-btn-ghost" type="button" onClick={()=>{setEditing(null);setChannel(emptyChannel)}}>Annuler</button>}</div>
    </form>
   </section>
  </>}
 </div>;
}
