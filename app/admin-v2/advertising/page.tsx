'use client';
import { useCallback, useEffect, useState } from 'react';
type Slot={banner:number;slot:number;advertiser:string;image_url:string;target_url:string;alt:string;active:boolean;updated_at?:string};
export default function AdvertisingV2(){
  const [items,setItems]=useState<Slot[]>([]);const [banner,setBanner]=useState(1);
  const [error,setError]=useState('');const [message,setMessage]=useState('');const [saving,setSaving]=useState<number|null>(null);
  const [loaded,setLoaded]=useState(false);
  const load=useCallback(async()=>{
    try{const r=await fetch('/api/admin-v2/ads',{cache:'no-store'});const j=await r.json();
      if(!r.ok)throw Error(j.error?.message??'Publicités indisponibles');
      setItems(j.data.items??[]);setLoaded(true);
    }catch(e){setError(e instanceof Error?e.message:'Erreur serveur')}
  },[]);
  useEffect(()=>{load()},[load]);
  const edit=(slot:number,key:keyof Slot,value:string|boolean)=>{
    setItems(rows=>rows.map(x=>x.banner===banner&&x.slot===slot?{...x,[key]:value}:x));setMessage('');
  };
  const save=async(x:Slot)=>{
    setSaving(x.slot);setError('');setMessage('');
    try{const r=await fetch('/api/admin-v2/ads',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(x),cache:'no-store'});
      const j=await r.json();if(!r.ok)throw Error(j.error?.message??'Impossible de sauvegarder');
      setMessage('Bandeau '+banner+', publicité '+x.slot+' : configuration enregistrée.');
    }catch(e){setError(e instanceof Error?e.message:'Erreur réseau')}finally{setSaving(null)}
  };
  return <div><div className="v2-head"><div><h1 className="v2-title">Bandeaux publicitaires</h1><p className="v2-lede">5 bandeaux × 5 annonces, soit 25 emplacements. Chaque carrousel défile automatiquement.</p></div></div>
    <div className="v2-note">Les images doivent être hébergées (URL HTTPS ou fichier local). Une annonce désactivée reste un espace publicitaire vide. La publication est mise en cache pendant 60 secondes.</div>
    <div className="v2-toolbar" role="group" aria-label="Choisir un bandeau">{[1,2,3,4,5].map(n=><button type="button" key={n} aria-pressed={n===banner}
      className={'admin-btn '+(n===banner?'admin-btn-primary':'admin-btn-ghost')} onClick={()=>{setBanner(n);setError('');setMessage('')}}>Bandeau {n}</button>)}</div>
    {error&&<div role="alert" className="v2-error">{error}</div>}{message&&<div role="status" className="v2-success">{message}</div>}
    {!loaded?<p>Chargement des publicités…</p>:<div style={{display:'grid',gap:16}}>
      {items.filter(x=>x.banner===banner).map(x=><section key={x.slot} className="v2-card">
        <div className="v2-head"><h2 className="v2-panel-title">Publicité {x.slot}/5</h2><label style={{display:'flex',gap:8,alignItems:'center'}}>
          <input type="checkbox" checked={x.active} onChange={e=>edit(x.slot,'active',e.target.checked)}/> Activer cette publicité</label></div>
        {x.image_url&&<img src={x.image_url} alt={x.alt||'Aperçu'} style={{display:'block',width:'100%',maxHeight:160,objectFit:'contain',marginBottom:12}}/>}
        <div className="v2-edit-grid">
          <div><label className="v2-field"><span>Annonceur</span><input value={x.advertiser} maxLength={120} onChange={e=>edit(x.slot,'advertiser',e.target.value)}/></label>
            <label className="v2-field"><span>URL du visuel</span><input type="text" value={x.image_url} maxLength={700} placeholder="https://…/banniere.webp" onChange={e=>edit(x.slot,'image_url',e.target.value)}/></label></div>
          <div><label className="v2-field"><span>Lien vers l'annonceur</span><input type="url" value={x.target_url} maxLength={700} placeholder="https://…" onChange={e=>edit(x.slot,'target_url',e.target.value)}/></label>
            <label className="v2-field"><span>Texte alternatif du visuel *</span><input value={x.alt} maxLength={300} onChange={e=>edit(x.slot,'alt',e.target.value)}/></label></div>
        </div><button type="button" className="admin-btn admin-btn-primary" disabled={saving!==null} onClick={()=>save(x)}>
          {saving===x.slot?'Enregistrement…':'Enregistrer cette publicité'}</button>
      </section>)}
    </div>}
  </div>;
}
