'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
type Article={id:string;title:string;slug:string;status:string;updated_at:string;published_at:string|null};
const statuses:Record<string,string>={draft:'Brouillon',in_review:'À valider',approved:'Validé',scheduled:'Programmé',published:'Publié'};
export default function AdminV2Articles() {
  const [items,setItems]=useState<Article[]>([]);
  const [total,setTotal]=useState(0);
  const [q,setQ]=useState('');
  const [filter,setFilter]=useState('');
  const [page,setPage]=useState(1);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    const controller=new AbortController();
    const timer=window.setTimeout(async()=>{
      try{
        setLoading(true);setError('');
        const qs=new URLSearchParams({page:String(page),status:filter,q});
        const res=await fetch('/api/admin-v2/articles?'+qs.toString(),{signal:controller.signal,cache:'no-store'});
        const result=await res.json();
        if(!res.ok)throw new Error(result.error?.message??'Impossible de charger les articles');
        setItems(result.data.items??[]);setTotal(result.data.total??0);
      }catch(e){if(!controller.signal.aborted){setError(e instanceof Error?e.message:'Erreur réseau');setItems([]);}}
      finally{if(!controller.signal.aborted)setLoading(false)}
    },q?350:0);
    return ()=>{controller.abort();clearTimeout(timer)};
  },[q,filter,page]);
  return <div><div className="v2-head"><div><h1 className="v2-title">Articles</h1><p className="v2-lede">Gestion des brouillons, de la validation et des publications.</p></div><Link href="/admin-v2/articles/new" className="admin-btn admin-btn-primary">Nouvel article</Link></div>
    <section className="v2-card">
      <div className="v2-toolbar"><input type="search" aria-label="Rechercher un titre" placeholder="Rechercher un titre…" value={q} onChange={e=>{setQ(e.target.value);setPage(1)}}/>
        <select aria-label="Filtrer par statut" value={filter} onChange={e=>{setFilter(e.target.value);setPage(1)}}><option value="">Tous les statuts</option>{Object.entries(statuses).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></div>
      {error&&<p className="v2-error" role="alert">{error}</p>}
      {loading?<p role="status">Chargement des articles…</p>:items.length?<div className="v2-table-scroll"><table className="v2-table">
        <thead><tr><th>Titre</th><th>Statut</th><th>Modification</th><th>Actions</th></tr></thead>
        <tbody>{items.map(a=><tr key={a.id}><td><Link href={'/admin-v2/articles/'+a.id+'/edit'}>{a.title}</Link><small style={{display:'block',color:'#697994'}}>/{a.slug}</small></td><td>{statuses[a.status]??a.status}</td><td>{new Date(a.updated_at).toLocaleDateString('fr-FR')}</td>
          <td><Link href={'/admin-v2/articles/'+a.id+'/edit'} className="admin-btn admin-btn-ghost">Modifier</Link>{a.status==='published'&&<a href={'/article/'+a.slug} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-ghost">Voir</a>}</td>
        </tr>)}</tbody></table></div>:<p className="v2-note">Aucun article ne correspond à cette recherche.</p>}
      <div className="v2-toolbar" style={{justifyContent:'space-between',marginTop:18}}>
        <span>{total} article{total>1?'s':''} — page {page} / {Math.max(1,Math.ceil(total/20))}</span>
        <div className="v2-actions"><button className="admin-btn admin-btn-ghost" disabled={page<=1||loading} onClick={()=>setPage(x=>x-1)}>Précédent</button><button className="admin-btn admin-btn-ghost" disabled={page*20>=total||loading} onClick={()=>setPage(x=>x+1)}>Suivant</button></div></div>
    </section>
  </div>;
}
