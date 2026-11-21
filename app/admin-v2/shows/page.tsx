'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
type Show={id:string;slug:string;title:string;tagline:string;description:string;schedule_label:string;category_id:string|null;cover_media_id:string|null;is_active:boolean;position:number};
const empty={slug:'',title:'',tagline:'',description:'',schedule_label:'',category_id:null,cover_media_id:null,is_active:false,position:0};
export default function ShowsV2(){
 const [items,setItems]=useState<Show[]>([]);
 const [cats,setCats]=useState<{id:string;name:string}[]>([]);
 const [selected,setSelected]=useState<string|null>(null);
 const [form,setForm]=useState(empty as Omit<Show,'id'>);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');const [message,setMessage]=useState('');
 const load=useCallback(async()=>{
  try{const [s,c]=await Promise.all([
   fetch('/api/admin-v2/shows',{cache:'no-store'}).then(r=>r.json()),
   fetch('/api/admin-v2/categories',{cache:'no-store'}).then(r=>r.json()),
  ]);setItems(s.data?.items??[]);setCats(c.data?.items??[]);
  }catch(e){setError(e instanceof Error?e.message:'Émissions indisponibles')}
 },[]);
 useEffect(()=>{load()},[load]);
 const edit=(s:Show)=>{setSelected(s.id);const {id,...f}=s;setForm(f);setMessage('')};
 const change=(k:keyof Omit<Show,'id'>,v:unknown)=>setForm(f=>({...f,[k]:v}));
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');setMessage('');
   try{const r=await fetch('/api/admin-v2/shows',{method:selected?'PATCH':'POST',
     headers:{'Content-Type':'application/json'},body:JSON.stringify(selected?{...form,id:selected}:form),cache:'no-store'});
     const j=await r.json();if(!r.ok)throw Error(j.error?.message??'Impossible d’enregistrer');
     setMessage('Émission enregistrée.');setSelected(null);setForm(empty);await load();
   }catch(e){setError(e instanceof Error?e.message:'Erreur réseau')}finally{setBusy(false)}
 }
 return <div><div className="v2-head"><div><h1 className="v2-title">Émissions</h1><p className="v2-lede">Créer et organiser les programmes TV+ Afrique.</p></div><Link href="/admin-v2/replays" className="admin-btn admin-btn-ghost">Gérer les replays</Link></div>
   {error&&<p className="v2-error" role="alert">{error}</p>}{message&&<p className="v2-success" role="status">{message}</p>}
   <div className="v2-edit-grid"><section className="v2-card"><h2 className="v2-panel-title">Programmes enregistrés · {items.length}</h2>
     <div className="v2-table-scroll"><table className="v2-table"><thead><tr><th>Émission</th><th>Créneau</th><th>État</th><th>Actions</th></tr></thead><tbody>
     {items.map(s=><tr key={s.id}><td>{s.title}</td><td>{s.schedule_label}</td><td>{s.is_active?'Visible':'Masquée'}</td><td><button className="admin-btn admin-btn-ghost" onClick={()=>edit(s)}>Modifier</button></td></tr>)}</tbody></table></div>
     {!items.length&&<p className="v2-note">Aucune émission. Créez votre premier programme.</p>}</section>
     <section className="v2-card"><h2 className="v2-panel-title">{selected?'Modifier une émission':'Nouvelle émission'}</h2>
       <form onSubmit={save}><label className="v2-field"><span>Nom *</span><input required minLength={3} value={form.title} onChange={e=>{const name=e.target.value;setForm(f=>({...f,title:name,slug:selected?f.slug:name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') }))}}/></label>
       <label className="v2-field"><span>URL</span><input required value={form.slug} onChange={e=>change('slug',e.target.value)}/></label>
       <label className="v2-field"><span>Accroche</span><input value={form.tagline} onChange={e=>change('tagline',e.target.value)}/></label>
       <label className="v2-field"><span>Description</span><textarea value={form.description} onChange={e=>change('description',e.target.value)}/></label>
       <label className="v2-field"><span>Créneau d'antenne</span><input value={form.schedule_label} onChange={e=>change('schedule_label',e.target.value)}/></label>
       <label className="v2-field"><span>Rubrique</span><select value={form.category_id??''} onChange={e=>change('category_id',e.target.value||null)}><option value="">Aucune</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
       <label className="v2-field"><span><input type="checkbox" checked={form.is_active} onChange={e=>change('is_active',e.target.checked)}/> Afficher sur le site public</span></label>
       <div className="v2-actions"><button type="submit" disabled={busy} className="admin-btn admin-btn-primary">{busy?'Enregistrement…':'Enregistrer'}</button>{selected&&<button type="button" className="admin-btn admin-btn-ghost" onClick={()=>{setSelected(null);setForm(empty)}}>Annuler</button>}</div></form>
     </section></div></div>;
}
