'use client';

import PaginatedList from '../../../components/admin/PaginatedList';
import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, ExternalLink, ImageIcon, Megaphone, Save } from 'lucide-react';
type Slot={banner:number;slot:number;advertiser:string;image_url:string;target_url:string;alt:string;active:boolean;starts_at:string|null;ends_at:string|null;updated_at?:string};
type Media={id:string;url:string;alt:string};
const labels=['Après les titres','Après le fil d’actu','Après le direct','Après la sélection','Avant la newsletter'];
const local=(iso:string|null)=>iso?new Date(iso).toLocaleString('sv-SE',{timeZone:'Africa/Libreville'}).replace(' ','T').slice(0,16):'';
const utc=(v:string)=>v?new Date(v+':00+01:00').toISOString():null;
function state(x:Slot){if(!x.active)return 'Désactivée';const now=Date.now();if(x.starts_at&&Date.parse(x.starts_at)>now)return 'Programmée';if(x.ends_at&&Date.parse(x.ends_at)<=now)return 'Terminée';return 'En diffusion'}
export default function AdvertisingV2(){
 const [items,setItems]=useState<Slot[]>([]),[banner,setBanner]=useState(1),[media,setMedia]=useState<Media[]>([]);
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[saving,setSaving]=useState<string|null>(null),[loading,setLoading]=useState(true);
 const load=useCallback(async()=>{
  const [a,b]=await Promise.all([fetch('/api/admin-v2/ads',{cache:'no-store'}),fetch('/api/admin-v2/media?pageSize=60',{cache:'no-store'})]);
  const j=await a.json();if(!a.ok)throw Error(j.error?.message||'Publicités indisponibles');setItems(j.data.items||[]);
  if(b.ok){const m=await b.json();setMedia(m.data?.items||[])}
 },[]);
 useEffect(()=>{load().catch(e=>setError(e.message)).finally(()=>setLoading(false))},[load]);
 const edit=(x:Slot,key:keyof Slot,value:string|boolean|number|null)=>{setItems(rows=>rows.map(r=>r.banner===x.banner&&r.slot===x.slot?{...r,[key]:value}:r));setMessage('')};
 async function save(x:Slot){
  const id=x.banner+'-'+x.slot;setSaving(id);setError('');setMessage('');
  try{const r=await fetch('/api/admin-v2/ads',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(x)});
   const j=await r.json();if(!r.ok)throw Error(j.error?.message||'Enregistrement impossible');
   await load();setMessage('Bandeau '+x.banner+', emplacement '+x.slot+' : annonce enregistrée.');
  }catch(e){setError(e instanceof Error?e.message:'Erreur réseau')}finally{setSaving(null)}
 }
 const active=items.filter(x=>state(x)==='En diffusion').length,planned=items.filter(x=>state(x)==='Programmée').length;
 return <div className="v2-regie">
  <header className="v2-head"><div><p className="v2-newsroom-eyebrow">MONÉTISATION · CAMPAGNES</p><h1 className="v2-title">Régie publicitaire</h1>
   <p className="v2-lede">Cinq bandeaux, vingt-cinq emplacements : visuels, annonceurs, liens et calendrier de publication.</p></div>
  </header>
  <div className="v2-regie-summary">
   <div className="v2-card"><Megaphone size={21}/><p>Emplacements</p><strong>{items.length}</strong></div>
   <div className="v2-card"><ImageIcon size={21}/><p>Annonces diffusées</p><strong>{active}</strong></div>
   <div className="v2-card"><CalendarClock size={21}/><p>Campagnes futures</p><strong>{planned}</strong></div>
  </div>
  {error&&<p className="v2-error" role="alert">{error}</p>}{message&&<p className="v2-success" role="status">{message}</p>}
  <div className="v2-toolbar" role="group" aria-label="Choisir un bandeau">{labels.map((label,i)=><button key={i} type="button" aria-pressed={banner===i+1}
    className={'admin-btn '+(banner===i+1?'admin-btn-primary':'admin-btn-ghost')} onClick={()=>{setBanner(i+1);setMessage('')}}>Bandeau {i+1}</button>)}</div>
  <div className="v2-card"><h2 className="v2-panel-title">Bandeau {banner} · {labels[banner-1]}</h2>
   <p className="v2-note">Les modifications s'appliquent uniquement à l'emplacement enregistré. L'affichage public respecte les dates, l'activation et le cache du site.</p></div>
  {loading?<p>Chargement des campagnes…</p>:<div className="v2-regie-ads">
   <PaginatedList key={banner} items={items.filter(x=>x.banner===banner)} pageSize={2}>{(entries) => entries.map(x => <section key={x.slot} className="v2-card">
    <div className="v2-regie-section-head"><h3>Emplacement {x.slot}/5</h3><span>{state(x)}</span></div>
    <div className="v2-regie-ad-preview">{x.image_url?<img src={x.image_url} alt={x.alt||'Visuel publicitaire'}/>:<div><ImageIcon size={28}/><span>Choisir un visuel</span></div>}</div>
    <div className="v2-regie-times">
     <label className="v2-field"><span>Annonceur</span><input value={x.advertiser} maxLength={120} onChange={e=>edit(x,'advertiser',e.target.value)}/></label>
     <label className="v2-field"><span>URL du visuel</span><input value={x.image_url} maxLength={700} placeholder="https://..." onChange={e=>edit(x,'image_url',e.target.value)}/></label>
    </div>
    {media.length>0&&<label className="v2-field"><span>Ou sélectionner un visuel existant</span>
     <select value="" onChange={e=>{if(e.target.value)edit(x,'image_url',e.target.value)}}><option value="">Médiathèque TV+</option>{media.filter(m=>m.url).map(m=><option key={m.id} value={m.url}>{m.alt||m.id}</option>)}</select></label>}
    <div className="v2-regie-times">
     <label className="v2-field"><span>Destination de la campagne (HTTPS)</span><input type="url" value={x.target_url} maxLength={700} placeholder="https://..." onChange={e=>edit(x,'target_url',e.target.value)}/></label>
     <label className="v2-field"><span>Texte alternatif *</span><input value={x.alt} maxLength={300} onChange={e=>edit(x,'alt',e.target.value)}/></label>
    </div>
    <div className="v2-regie-times">
     <label className="v2-field"><span>Début de campagne · Libreville</span><input type="datetime-local" value={local(x.starts_at)} onChange={e=>edit(x,'starts_at',utc(e.target.value))}/></label>
     <label className="v2-field"><span>Fin de campagne · Libreville</span><input type="datetime-local" value={local(x.ends_at)} onChange={e=>edit(x,'ends_at',utc(e.target.value))}/></label>
    </div>
    <label className="v2-regie-check"><input type="checkbox" checked={x.active} onChange={e=>edit(x,'active',e.target.checked)}/> Activer la campagne</label>
    <div className="v2-actions"><button type="button" disabled={saving!==null} className="admin-btn admin-btn-primary" onClick={()=>void save(x)}><Save size={16}/>{saving===x.banner+'-'+x.slot?'Enregistrement…':'Enregistrer l’emplacement'}</button>
     {x.target_url&&<a href={x.target_url} target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-ghost">Tester le lien <ExternalLink size={14}/></a>}</div>
   </section>)}</PaginatedList>
  </div>}
 </div>;
}
