'use client';
import {useNotifications} from '../../../components/notifications/NotificationProvider';

import SproutVideoPicker from '../../../components/admin/SproutVideoPicker';
import PaginatedList from '../../../components/admin/PaginatedList';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, ExternalLink, Film, Plus, Search, Trash2 } from 'lucide-react';
import { parseVideoUrl, videoEmbedUrl } from '../../../lib/video/providers';

type Replay={id:string;show_id:string;title:string;description:string;aired_at:string;duration_seconds:number|null;platform:string|null;external_id:string|null;source_url:string;thumbnail_url:string;publish_at:string|null;status:'draft'|'published'};
type ReplayForm=Omit<Replay,'id'|'platform'|'external_id'>;
const empty:ReplayForm={show_id:'',title:'',description:'',aired_at:new Date().toISOString(),duration_seconds:null,source_url:'',thumbnail_url:'',publish_at:null,status:'draft'};
const display=(iso:string|null)=>iso?new Date(iso).toLocaleString('fr-GA',{timeZone:'Africa/Libreville',dateStyle:'medium',timeStyle:'short'}):'—';
const local=(iso:string|null)=>iso?new Date(iso).toLocaleString('sv-SE',{timeZone:'Africa/Libreville'}).replace(' ','T').slice(0,16):'';
const utc=(value:string)=>value?new Date(value+':00+01:00').toISOString():null;

export default function ReplaysV2(){
 const {confirm:askConfirm}=useNotifications();
 const [items,setItems]=useState<Replay[]>([]),[shows,setShows]=useState<{id:string;title:string}[]>([]);
 const [editing,setEditing]=useState<string|null>(null),[form,setForm]=useState<ReplayForm>(empty);
 const [mode,setMode]=useState<'draft'|'published'|'scheduled'>('draft');
 const [when,setWhen]=useState('');
 const [filter,setFilter]=useState('all'),[query,setQuery]=useState(''),[showFilter,setShowFilter]=useState('');
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const load=useCallback(async()=>{
  const [a,b]=await Promise.all([fetch('/api/admin-v2/episodes',{cache:'no-store'}),fetch('/api/admin-v2/shows',{cache:'no-store'})]);
  const [e,s]=await Promise.all([a.json(),b.json()]);
  if(!a.ok||!b.ok)throw Error(e.error?.message||s.error?.message||'Bibliothèque indisponible.');
  setItems(e.data.items||[]);setShows(s.data.items||[]);
 },[]);
 useEffect(()=>{const show=new URLSearchParams(window.location.search).get('show');if(show){setShowFilter(show);setForm(f=>({...f,show_id:show}));}load().catch(e=>setError(e.message)).finally(()=>setLoading(false))},[load]);
 function edit(item:Replay){setEditing(item.id);const {id,platform,external_id,...fields}=item;setForm(fields);setWhen(local(item.publish_at));setMode(item.status==='published'?'published':item.publish_at?'scheduled':'draft');setMessage('')}
 const change=<K extends keyof ReplayForm>(key:K,value:ReplayForm[K])=>setForm(f=>({...f,[key]:value}));
 function reset(){setForm({...empty,show_id:showFilter,aired_at:new Date().toISOString()});setMode('draft');setWhen('');setEditing(null)}
 async function save(event:React.FormEvent){
  event.preventDefault();setBusy(true);setError('');setMessage('');
  try{
   const p={...form,publish_at:mode==='scheduled'?utc(when):null,status:mode==='published'?'published':'draft'};
   if(mode==='scheduled'&&(!when||!utc(when)||Date.parse(utc(when)!)<Date.now()+60_000))throw Error('Choisissez une date future, heure de Libreville.');
   const r=await fetch('/api/admin-v2/episodes',{method:editing?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(editing?{...p,id:editing}:p)});
   const v=await r.json();if(!r.ok)throw Error(v.error?.message||'Enregistrement impossible');
   reset();await load();setMessage(mode==='scheduled'?'Replay programmé.':'Replay enregistré.');
  }catch(e){setError(e instanceof Error?e.message:'Erreur réseau')}finally{setBusy(false)}
 }
 async function remove(id:string){
  if(!await askConfirm('Supprimer ce replay de la bibliothèque et du site public ?'))return;
  setBusy(true);setError('');try{
   const r=await fetch('/api/admin-v2/episodes',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
   const v=await r.json();if(!r.ok)throw Error(v.error?.message||'Suppression impossible');
   await load();if(editing===id)reset();setMessage('Replay supprimé.');
  }catch(e){setError(e instanceof Error?e.message:'Erreur réseau')}finally{setBusy(false)}
 }
 const source=parseVideoUrl(form.source_url);
 const embed=videoEmbedUrl(source?.platform||null,source?.externalId||null,form.source_url);
 const filtered=items.filter(x=>(filter==='all'||(filter==='scheduled'?x.status==='draft'&&!!x.publish_at:(filter==='draft'?x.status==='draft'&&!x.publish_at:x.status===filter)))&&(!showFilter||x.show_id===showFilter)&&(x.title+' '+x.description).toLowerCase().includes(query.toLowerCase()));
 const planned=items.filter(x=>x.status==='draft'&&x.publish_at).length;
 return <div className="v2-regie">
  <header className="v2-head"><div><p className="v2-newsroom-eyebrow">DIFFUSION · VIDÉOTHÈQUE</p>
   <h1 className="v2-title">Replays & programmation</h1><p className="v2-lede">Choisissez une vidéo dans SproutVideo ou renseignez un lien pour préparer sa diffusion.</p></div>
   <Link href="/replays" target="_blank" className="admin-btn admin-btn-ghost"><ExternalLink size={16}/> Replays publics</Link></header>
  <div className="v2-regie-summary"><div className="v2-card"><Film size={21}/><p>Épisodes enregistrés</p><strong>{items.length}</strong></div>
   <div className="v2-card"><Film size={21}/><p>En ligne</p><strong>{items.filter(e=>e.status==='published').length}</strong></div>
   <div className="v2-card"><CalendarClock size={21}/><p>Programmés</p><strong>{planned}</strong></div></div>
  {error&&<p className="v2-error" role="alert">{error}</p>}{message&&<p className="v2-success" role="status">{message}</p>}
  <div className="v2-edit-grid">
   <section className="v2-card"><h2 className="v2-panel-title">Bibliothèque des épisodes</h2>
    <div className="v2-regie-filter-row"><label><Search size={16}/><input type="search" aria-label="Rechercher un replay" placeholder="Rechercher un titre…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
     <select aria-label="Statut du replay" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Tous</option><option value="published">En ligne</option><option value="scheduled">Programmés</option><option value="draft">Brouillons</option></select>
     <select aria-label="Émission" value={showFilter} onChange={e=>setShowFilter(e.target.value)}><option value="">Toutes les émissions</option>{shows.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></div>
    {loading?<p>Chargement…</p>:!filtered.length?<p className="v2-note">Aucun replay ne correspond aux filtres.</p>:<div className="v2-regie-channels">
     <PaginatedList key={showFilter + filter + query} items={filtered} pageSize={6}>{(entries) => entries.map(item => <div className="v2-regie-channel" key={item.id}><div>
      <strong>{item.title}</strong><span>{shows.find(s=>s.id===item.show_id)?.title||'Émission'} · {item.platform||parseVideoUrl(item.source_url)?.platform||'Sans vidéo'} · {item.status==='published'?'En ligne':item.publish_at?'Programmé le '+display(item.publish_at):'Brouillon'}</span>
      {item.source_url&&<a href={item.source_url} target="_blank" rel="noopener noreferrer">Voir la vidéo source <ExternalLink size={13}/></a>}</div>
      <div className="v2-actions"><button type="button" className="admin-btn admin-btn-ghost" onClick={()=>edit(item)}>Modifier</button>
       <button type="button" className="admin-btn admin-btn-ghost" disabled={busy} onClick={()=>void remove(item.id)} aria-label={'Supprimer '+item.title}><Trash2 size={16}/></button></div>
     </div>)}</PaginatedList></div>}
   </section>
   <section className="v2-card"><h2 className="v2-panel-title">{editing?'Modifier le replay':'Créer un replay'}</h2>
    <form onSubmit={save}>
     <label className="v2-field"><span>Émission *</span><select required value={form.show_id} onChange={e=>change('show_id',e.target.value)}><option value="">Sélectionner une émission</option>{shows.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
     <label className="v2-field"><span>Titre *</span><input required minLength={3} maxLength={200} value={form.title} onChange={e=>change('title',e.target.value)}/></label>
     <SproutVideoPicker key={editing ?? 'new'} kind="replay" disabled={busy} onSelect={video => setForm(current => ({
      ...current,
      source_url: video.sourceUrl,
      title: current.title.trim() ? current.title : video.title,
      duration_seconds: video.durationSeconds,
      thumbnail_url: current.thumbnail_url || video.thumbnailUrl,
     }))}/>
     <details>
      <summary>Saisir un lien vidéo manuellement</summary>
      <label className="v2-field"><span>URL de la vidéo</span><input type="url" maxLength={1300} value={form.source_url} onChange={e=>change('source_url',e.target.value)}/></label>
     </details>
     {embed&&<div className="v2-regie-preview"><iframe src={embed} title="Aperçu du replay" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="autoplay; fullscreen; picture-in-picture" style={{width:'100%',aspectRatio:'16/9',border:0}}/></div>}
     <label className="v2-field"><span>Vignette de couverture (URL HTTPS)</span><input type="url" maxLength={1300} value={form.thumbnail_url} onChange={e=>change('thumbnail_url',e.target.value)}/></label>
     <div className="v2-regie-times">
      <label className="v2-field"><span>Date originale de diffusion · Libreville</span><input type="datetime-local" value={local(form.aired_at)} required onChange={e=>{const value=utc(e.target.value);if(value)change('aired_at',value)}}/></label>
      <label className="v2-field"><span>Durée en secondes</span><input type="number" min={0} value={form.duration_seconds??''} onChange={e=>change('duration_seconds',e.target.value?Number(e.target.value):null)}/></label>
     </div>
     <label className="v2-field"><span>Mode de publication</span><select value={mode} onChange={e=>setMode(e.target.value as typeof mode)}><option value="draft">Conserver en brouillon</option><option value="published">Publier immédiatement</option><option value="scheduled">Programmer la publication</option></select></label>
     {mode==='scheduled'&&<label className="v2-field"><span>Date et heure programmées · Libreville *</span><input type="datetime-local" value={when} required onChange={e=>setWhen(e.target.value)}/></label>}
     <div className="v2-actions"><button className="admin-btn admin-btn-primary" type="submit" disabled={busy||!shows.length}><Plus size={16}/>{busy?'Enregistrement…':editing?'Mettre à jour le replay':'Enregistrer le replay'}</button>
      {editing&&<button type="button" className="admin-btn admin-btn-ghost" onClick={reset}>Annuler</button>}</div>
    </form>
    {!shows.length&&<p className="v2-note">Créez une émission avant d'ajouter ses épisodes.</p>}
   </section>
  </div>
 </div>;
}
