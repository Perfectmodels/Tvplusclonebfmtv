'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
export default function LiveV2(){
  const [title,setTitle]=useState('TV+ Afrique en direct');
  const [url,setUrl]=useState('');const [enabled,setEnabled]=useState(false);
  const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');const [message,setMessage]=useState('');
  useEffect(()=>{fetch('/api/admin-v2/live',{cache:'no-store'}).then(async r=>{
    const j=await r.json();if(!r.ok)throw Error(j.error?.message??'Paramètres indisponibles');return j.data;
  }).then(x=>{setTitle(x.title);setUrl(x.hls_url);setEnabled(Boolean(x.enabled));}).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
  async function save(event:React.FormEvent){
    event.preventDefault();setSaving(true);setError('');setMessage('');
    try{const r=await fetch('/api/admin-v2/live',{method:'PATCH',
      headers:{'Content-Type':'application/json'},body:JSON.stringify({title,hls_url:url,enabled}),cache:'no-store'});
      const j=await r.json();if(!r.ok)throw Error(j.error?.message??'Impossible d’enregistrer');
      setMessage('Configuration enregistrée. Actualisation du direct public en moins d’une minute.');
    }catch(e){setError(e instanceof Error?e.message:'Erreur réseau')}finally{setSaving(false)}
  }
  return <div><div className="v2-head"><div><h1 className="v2-title">Diffusion en direct</h1>
    <p className="v2-lede">Le flux vidéo est hébergé par un outil externe. Vercel ne stocke ni ne retransmet les vidéos.</p></div>
    <Link className="admin-btn admin-btn-ghost" href="/direct" target="_blank">Voir la page Direct</Link></div>
    <div className="v2-edit-grid"><section className="v2-card"><h2 className="v2-panel-title">Lecteur HLS public</h2>
      {error&&<p className="v2-error" role="alert">{error}</p>}{message&&<p className="v2-success" role="status">{message}</p>}
      {loading?<p>Chargement…</p>:<form onSubmit={save}>
        <label className="v2-field"><span>Nom du direct</span><input required minLength={3} maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label>
        <label className="v2-field"><span>URL HLS (fichier .m3u8 externe)</span><input type="url" placeholder="https://diffuseur.example/direct/master.m3u8" value={url} maxLength={1400} onChange={e=>setUrl(e.target.value)}/></label>
        <label className="v2-field"><span><input type="checkbox" checked={enabled} onChange={e=>setEnabled(e.target.checked)}/> Activer le lecteur public</span></label>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>{saving?'Enregistrement…':'Enregistrer les réglages'}</button>
      </form>}</section>
      <section className="v2-card"><h2 className="v2-panel-title">Architecture de diffusion</h2>
        <p>OBS, Restream ou votre diffuseur envoie la vidéo sur votre service externe. Ce service fournit une URL HLS lisible par les visiteurs.</p>
        <p className="v2-note">Ce tableau de bord contrôle uniquement le lecteur public HLS. Il ne génère pas de clé RTMP et n'héberge pas la vidéo. Ne renseignez pas ici une clé de diffusion privée.</p>
        <p>Le lecteur est désactivé tant qu'aucune URL HLS n'est configurée et activée.</p>
      </section></div>
  </div>;
}
