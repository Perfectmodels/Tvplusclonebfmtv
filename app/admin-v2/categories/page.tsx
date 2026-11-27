'use client';
import {useNotifications} from '../../../components/notifications/NotificationProvider';

import PaginatedList from '../../../components/admin/PaginatedList';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDownUp, BookOpen, FolderTree, Plus, Search, Trash2 } from 'lucide-react';

type Cat={id:string;name:string;slug:string;description:string;position:number;parent_id:string|null;hue:number;article_count:number};
type Form={name:string;slug:string;description:string;position:number;parent_id:string|null;hue:number};
const blank:Form={name:'',slug:'',description:'',position:0,parent_id:null,hue:216};
function slugify(v:string){return v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,75)}
export default function CategoriesV2(){
 const {confirm:askConfirm}=useNotifications();
 const [items,setItems]=useState<Cat[]>([]),[form,setForm]=useState(blank);
 const [editing,setEditing]=useState<string|null>(null),[search,setSearch]=useState('');
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState('');
 const load=useCallback(async()=>{
  const r=await fetch('/api/admin-v2/categories',{cache:'no-store'});const j=await r.json();
  if(!r.ok)throw Error(j.error?.message||'Rubriques indisponibles');setItems(j.data?.items||[]);
 },[]);
 useEffect(()=>{load().catch(e=>setError(e.message)).finally(()=>setLoading(false))},[load]);
 function reset(){setEditing(null);setForm(blank)}
 function edit(c:Cat){setEditing(c.id);setForm({name:c.name,slug:c.slug,description:c.description||'',position:c.position,parent_id:c.parent_id,hue:c.hue})}
 const field=<K extends keyof Form>(key:K,value:Form[K])=>setForm(f=>({...f,[key]:value}));
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');setMessage('');
  try{const r=await fetch(editing?'/api/admin-v2/categories/'+editing:'/api/admin-v2/categories',{
   method:editing?'PATCH':'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify(editing?{name:form.name,description:form.description,parent_id:form.parent_id,position:form.position,hue:form.hue}:form)});
   const j=await r.json();if(!r.ok)throw Error(j.error?.message||'Enregistrement impossible');
   reset();await load();setMessage('Rubrique mise à jour.');
  }catch(e){setError(e instanceof Error?e.message:'Erreur réseau')}finally{setBusy(false)}
 }
 async function remove(c:Cat){if(!await askConfirm('Supprimer la rubrique « '+c.name+' » ? Cette action est impossible si elle est utilisée.'))return;
  setBusy(true);setError('');try{const r=await fetch('/api/admin-v2/categories/'+c.id,{method:'DELETE'});
   const j=await r.json();if(!r.ok)throw Error(j.error?.message||'Suppression refusée');
   if(editing===c.id)reset();await load();setMessage('Rubrique supprimée.');
  }catch(e){setError(e instanceof Error?e.message:'Erreur réseau')}finally{setBusy(false)}
 }
 const visible=items.filter(c=>(c.name+' '+c.description+' '+c.slug).toLowerCase().includes(search.toLowerCase()));
 const parentName=(id:string|null)=>items.find(x=>x.id===id)?.name||'Principale';
 return <div className="v2-regie">
  <header className="v2-head"><div><p className="v2-newsroom-eyebrow">RÉDACTION · STRUCTURE DU SITE</p>
   <h1 className="v2-title">Rubriques & arborescence</h1><p className="v2-lede">Organisez le classement éditorial, les sous-rubriques, les descriptions et l'ordre d'affichage.</p></div>
   <Link href="/" target="_blank" className="admin-btn admin-btn-ghost">Voir le site public</Link>
  </header>
  <div className="v2-regie-summary">
   <div className="v2-card"><FolderTree size={22}/><p>Rubriques</p><strong>{items.length}</strong></div>
   <div className="v2-card"><BookOpen size={22}/><p>Articles classés</p><strong>{items.reduce((sum,c)=>sum+c.article_count,0)}</strong></div>
   <div className="v2-card"><ArrowDownUp size={22}/><p>Sous-rubriques</p><strong>{items.filter(c=>c.parent_id).length}</strong></div>
  </div>
  {error&&<p className="v2-error" role="alert">{error}</p>}{message&&<p className="v2-success" role="status">{message}</p>}
  <div className="v2-edit-grid">
   <section className="v2-card"><div className="v2-regie-section-head"><h2 className="v2-panel-title">Plan éditorial</h2><span>{visible.length} résultat(s)</span></div>
    <label className="v2-regie-search"><Search size={17}/><input type="search" placeholder="Rechercher une rubrique…" aria-label="Rechercher une rubrique" value={search} onChange={e=>setSearch(e.target.value)}/></label>
    {loading?<p>Chargement…</p>:<div className="v2-regie-channels"><PaginatedList key={search} items={visible} pageSize={6}>{(entries) => entries.map(c => <div key={c.id} className="v2-regie-category">
     <span className="v2-regie-color" style={{backgroundColor:'hsl('+c.hue+' 65% 48%)'}}/>
     <div><strong>{c.name}</strong><span>/{c.slug} · {parentName(c.parent_id)} · Position {c.position}</span><small>{c.article_count} article(s) · {c.description||'Sans description'}</small></div>
     <div className="v2-actions"><button type="button" className="admin-btn admin-btn-ghost" onClick={()=>edit(c)}>Modifier</button>
      <button type="button" className="admin-btn admin-btn-ghost" disabled={busy||c.article_count>0||items.some(x=>x.parent_id===c.id)} onClick={()=>void remove(c)} aria-label={'Supprimer '+c.name} title="Suppression autorisée uniquement si la rubrique est libre"><Trash2 size={15}/></button></div>
    </div>)}</PaginatedList></div>}
   </section>
   <section className="v2-card"><h2 className="v2-panel-title">{editing?'Modifier la rubrique':'Nouvelle rubrique'}</h2>
    <form onSubmit={save}>
     <label className="v2-field"><span>Nom *</span><input required minLength={2} maxLength={85} value={form.name} onChange={e=>{const name=e.target.value;setForm(f=>({...f,name,slug:editing?f.slug:slugify(name)}))}}/></label>
     <label className="v2-field"><span>Identifiant d’URL {editing?'(conservé pour le SEO)':'*'}</span><input value={form.slug} required disabled={!!editing} onChange={e=>field('slug',slugify(e.target.value))}/></label>
     <label className="v2-field"><span>Description éditoriale</span><textarea value={form.description} maxLength={300} rows={4} onChange={e=>field('description',e.target.value)}/></label>
     <label className="v2-field"><span>Rubrique parente</span><select value={form.parent_id||''} onChange={e=>field('parent_id',e.target.value||null)}>
      <option value="">Rubrique principale</option>{items.filter(c=>c.id!==editing).map(c=><option value={c.id} key={c.id}>{c.name}</option>)}
     </select></label>
     <div className="v2-regie-times">
      <label className="v2-field"><span>Ordre d’affichage</span><input type="number" min={0} max={32000} value={form.position} onChange={e=>field('position',Number(e.target.value))}/></label>
      <label className="v2-field"><span>Teinte d’identification · {form.hue}°</span><input type="range" min={0} max={359} value={form.hue} onChange={e=>field('hue',Number(e.target.value))}/></label>
     </div>
     <div className="v2-regie-color-preview" style={{borderLeft:'6px solid hsl('+form.hue+' 65% 48%)'}}><strong>{form.name||'Aperçu rubrique'}</strong><span>Cette teinte est enregistrée pour l'identification éditoriale.</span></div>
     <div className="v2-actions"><button type="submit" className="admin-btn admin-btn-primary" disabled={busy}><Plus size={16}/>{busy?'Enregistrement…':'Enregistrer la rubrique'}</button>
      {editing&&<button type="button" onClick={reset} className="admin-btn admin-btn-ghost">Annuler</button>}</div>
    </form>
   </section>
  </div>
 </div>;
}
