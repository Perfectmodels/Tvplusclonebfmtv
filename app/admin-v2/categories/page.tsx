'use client';
import { useCallback, useEffect, useState } from 'react';
type Cat={id:string;name:string;slug:string;description:string;position:number};
export default function CategoriesV2(){
  const [items,setItems]=useState<Cat[]>([]);const [name,setName]=useState('');const [slug,setSlug]=useState('');const [description,setDescription]=useState('');
  const [editing,setEditing]=useState<string|null>(null);const [error,setError]=useState('');const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  const load=useCallback(async()=>{
    try{const r=await fetch('/api/admin-v2/categories',{cache:'no-store'});const j=await r.json();
      if(!r.ok)throw Error(j.error?.message??'Erreur de chargement');setItems(j.data.items??[]);
    }catch(e){setError(e instanceof Error?e.message:'Erreur réseau')}
  },[]);
  useEffect(()=>{load()},[load]);
  function reset(){setName('');setSlug('');setDescription('');setEditing(null)}
  async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');setMessage('');
    try{const r=await fetch(editing?'/api/admin-v2/categories/'+editing:'/api/admin-v2/categories',{
        method:editing?'PATCH':'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(editing?{name,description}:{name,slug,description}),cache:'no-store'});
      const j=await r.json();if(!r.ok)throw Error(j.error?.message??'Impossible de sauvegarder');
      reset();await load();setMessage('Rubrique enregistrée.');
    }catch(e){setError(e instanceof Error?e.message:'Erreur réseau')}finally{setBusy(false)}
  }
  return <div><div className="v2-head"><div><h1 className="v2-title">Rubriques</h1><p className="v2-lede">Organiser les catégories éditoriales et leurs URL.</p></div></div>
    {error&&<p className="v2-error" role="alert">{error}</p>}{message&&<p className="v2-success" role="status">{message}</p>}
    <div className="v2-edit-grid"><section className="v2-card"><h2 className="v2-panel-title">Rubriques existantes · {items.length}</h2>
      <div className="v2-table-scroll"><table className="v2-table"><thead><tr><th>Nom</th><th>URL</th><th>Action</th></tr></thead><tbody>
        {items.map(c=><tr key={c.id}><td>{c.name}</td><td>/{c.slug}</td><td><button type="button" className="admin-btn admin-btn-ghost" onClick={()=>{setEditing(c.id);setName(c.name);setSlug(c.slug);setDescription(c.description)}}>Modifier</button></td></tr>)}
      </tbody></table></div></section>
      <section className="v2-card"><h2 className="v2-panel-title">{editing?'Modifier la rubrique':'Nouvelle rubrique'}</h2>
        <form onSubmit={submit}><label className="v2-field"><span>Nom *</span><input required minLength={2} value={name} onChange={e=>setName(e.target.value)}/></label>
        {!editing&&<label className="v2-field"><span>URL (slug) *</span><input required pattern="[a-z0-9-]+" value={slug} onChange={e=>setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''))}/></label>}
        <label className="v2-field"><span>Description</span><textarea value={description} onChange={e=>setDescription(e.target.value)} maxLength={300}/></label>
        <div className="v2-actions"><button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>{busy?'Enregistrement…':'Enregistrer'}</button>{editing&&<button className="admin-btn admin-btn-ghost" type="button" onClick={reset}>Annuler</button>}</div></form>
      </section></div>
  </div>;
}
