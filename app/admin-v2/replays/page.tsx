'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
type Episode={id:string;show_id:string;title:string;description:string;aired_at:string;duration_seconds:number|null;platform:'youtube'|'tiktok'|null;external_id:string|null;status:'draft'|'published'};
const empty={show_id:'',title:'',description:'',aired_at:new Date().toISOString(),duration_seconds:null,platform:null,external_id:'',status:'draft' as const};
export default function ReplaysV2(){
 const [items,setItems]=useState<Episode[]>([]);const [shows,setShows]=useState<{id:string;title:string}[]>([]);
 const [editing,setEditing]=useState<string|null>(null);const [form,setForm]=useState(empty as Omit<Episode,'id'>);
 const [error,setError]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 const load=async()=>{
  try{const [e,s]=await Promise.all([fetch('/api/admin-v2/episodes',{cache:'no-store'}).then(r=>r.json()),fetch('/api/admin-v2/shows',{cache:'no-store'}).then(r=>r.json())]);
    if(!e.success||!s.success)throw Error('Chargement indisponible');
    setItems(e.data.items??[]);setShows(s.data.items??[]);
  }catch(e){setError(e instanceof Error?e.message:'Erreur réseau')}
 };
 useEffect(()=>{load()},[]);
 const edit=(x:Episode)=>{setEditing(x.id);const {id,...v}=x;setForm(v)};
 const change=(k:keyof Omit<Episode,'id'>,v:unknown)=>setForm(f=>({...f,[k]:v}));
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');setMessage('');
  try{const r=await fetch('/api/admin-v2/episodes',{method:editing?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(editing?{...form,id:editing}:form)});
    const j=await r.json();if(!r.ok)throw Error(j.error?.message??'Impossible d’enregistrer');
    setEditing(null);setForm(empty);await load();setMessage('Replay enregistré.');
  }catch(e){setError(e instanceof Error?e.message:'Erreur réseau')}finally{setBusy(false)}
 }
 return <div><div className="v2-head"><div><h1 className="v2-title">Replays et épisodes</h1><p className="v2-lede">Vidéos hébergées sur YouTube ou TikTok, sans stockage sur le site.</p></div><Link href="/admin-v2/shows" className="admin-btn admin-btn-ghost">Émissions</Link></div>
   {error&&<p role="alert" className="v2-error">{error}</p>}{message&&<p role="status" className="v2-success">{message}</p>}
   <div className="v2-edit-grid"><section className="v2-card"><h2 className="v2-panel-title">Épisodes · {items.length}</h2>
     <div className="v2-table-scroll"><table className="v2-table"><thead><tr><th>Titre</th><th>Émission</th><th>État</th><th>Action</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td>{x.title}</td><td>{shows.find(s=>s.id===x.show_id)?.title??'—'}</td><td>{x.status}</td><td><button type="button" className="admin-btn admin-btn-ghost" onClick={()=>edit(x)}>Modifier</button></td></tr>)}</tbody></table></div>
   </section>
   <section className="v2-card"><h2 className="v2-panel-title">{editing?'Modifier':'Nouvel épisode'}</h2>
     <form onSubmit={save}>
       <label className="v2-field"><span>Émission *</span><select required value={form.show_id} onChange={e=>change('show_id',e.target.value)}><option value="">Choisir</option>{shows.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
       <label className="v2-field"><span>Titre *</span><input required minLength={3} value={form.title} onChange={e=>change('title',e.target.value)}/></label>
       <label className="v2-field"><span>Description</span><textarea value={form.description} onChange={e=>change('description',e.target.value)}/></label>
       <label className="v2-field"><span>Date de diffusion</span><input type="datetime-local" required value={new Date(form.aired_at).toISOString().slice(0,16)} onChange={e=>change('aired_at',new Date(e.target.value).toISOString())}/></label>
       <label className="v2-field"><span>Plateforme</span><select value={form.platform??''} onChange={e=>change('platform',e.target.value||null)}><option value="">Aucune</option><option value="youtube">YouTube</option><option value="tiktok">TikTok</option></select></label>
       <label className="v2-field"><span>ID vidéo externe</span><input value={form.external_id??''} onChange={e=>change('external_id',e.target.value)}/></label>
       <label className="v2-field"><span>Durée en secondes</span><input type="number" min={0} value={form.duration_seconds??''} onChange={e=>change('duration_seconds',e.target.value?Number(e.target.value):null)}/></label>
       <label className="v2-field"><span>Statut</span><select value={form.status} onChange={e=>change('status',e.target.value)}><option value="draft">Brouillon</option><option value="published">Publié</option></select></label>
       <div className="v2-actions"><button type="submit" disabled={busy||!shows.length} className="admin-btn admin-btn-primary">{busy?'Enregistrement…':'Enregistrer'}</button>{editing&&<button type="button" className="admin-btn admin-btn-ghost" onClick={()=>{setEditing(null);setForm(empty)}}>Annuler</button>}</div>
     </form>{!shows.length&&<p className="v2-note">Créez une émission avant d’ajouter des replays.</p>}
   </section></div></div>;
}
