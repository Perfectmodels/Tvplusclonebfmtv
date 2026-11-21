'use client';
import { useEffect, useState } from 'react';
type Media={id:string;url:string;alt:string;mime_type:string;size_bytes:number;created_at:string};
export default function MediaV2Page(){
  const [items,setItems]=useState<Media[]>([]);const [page,setPage]=useState(1);const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(true);const [uploading,setUploading]=useState(false);
  const [error,setError]=useState('');const [message,setMessage]=useState('');const [alt,setAlt]=useState('');
  const [revision,setRevision]=useState(0);
  useEffect(()=>{const controller=new AbortController();
    setLoading(true);setError('');
    fetch('/api/admin-v2/media?page='+page+'&pageSize=32',{signal:controller.signal,cache:'no-store'})
      .then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error?.message??'Médiathèque indisponible');return j.data;})
      .then(d=>{setItems(d.items??[]);setTotal(d.total??0);})
      .catch(e=>{if(!controller.signal.aborted)setError(e.message)})
      .finally(()=>{if(!controller.signal.aborted)setLoading(false)});
    return()=>controller.abort();
  },[page,revision]);
  async function upload(file:File){
    if(!file.size||file.size>1024*1024){setError('La photo ne doit pas dépasser 1 Mo.');return}
    if(!file.type.startsWith('image/')){setError('Veuillez choisir une image.');return}
    setUploading(true);setError('');setMessage('');
    try{const form=new FormData();form.append('file',file);form.append('alt',alt||file.name);
      const r=await fetch('/api/admin-v2/media',{method:'POST',body:form,cache:'no-store'});const j=await r.json();
      if(!r.ok)throw Error(j.error?.message??'Envoi impossible');
      setPage(1);setRevision(x=>x+1);setMessage('Image optimisée 1200 × 630 enregistrée.');
    }catch(e){setError(e instanceof Error?e.message:'Erreur réseau')}finally{setUploading(false)}
  }
  return <div><div className="v2-head"><div><h1 className="v2-title">Médiathèque</h1><p className="v2-lede">{total} médias. Stockage Supabase, images existantes préservées.</p></div></div>
    <section className="v2-card" style={{marginBottom:18}}><h2 className="v2-panel-title">Importer une couverture</h2>
      <p className="v2-note">JPEG, PNG, WebP, AVIF ou GIF · 1 Mo maximum · export automatique au format WebP 1200 × 630.</p>
      <div className="v2-toolbar"><label className="v2-field"><span>Description alternative</span><input value={alt} onChange={e=>setAlt(e.target.value)} maxLength={240}/></label>
        <label className="v2-field"><span>Fichier</span><input type="file" accept="image/*" disabled={uploading} onChange={e=>{const f=e.target.files?.[0];if(f)upload(f);e.target.value=''}} /></label>
      </div>{uploading&&<p role="status">Traitement de l’image…</p>}</section>
    {error&&<div className="v2-error" role="alert">{error}</div>}{message&&<div className="v2-success" role="status">{message}</div>}
    <section className="v2-card">{loading?<p role="status">Chargement de la médiathèque…</p>:
      <div className="v2-image-grid">{items.map(m=><article key={m.id} className="v2-image-choice" style={{border:'1px solid #d5dce8',overflow:'hidden'}}>
        <img src={m.url} loading="lazy" alt={m.alt||'Image de la médiathèque'} />
        <div style={{padding:9,fontSize:11}}><p>{m.alt||'Sans description'}</p>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={async()=>{await navigator.clipboard.writeText(m.url);setMessage('Lien de l’image copié.')}}>Copier l’URL</button>
        </div></article>)}</div>}
      {!loading&&items.length===0&&<p>Aucun média disponible.</p>}
      <div className="v2-toolbar" style={{justifyContent:'space-between',marginTop:18}}><span>{total} médias · page {page}</span><div className="v2-actions">
        <button type="button" className="admin-btn admin-btn-ghost" disabled={page===1||loading} onClick={()=>setPage(p=>p-1)}>Précédent</button>
        <button type="button" className="admin-btn admin-btn-ghost" disabled={page*32>=total||loading} onClick={()=>setPage(p=>p+1)}>Suivant</button>
      </div></div></section></div>;
}
