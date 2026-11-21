'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ExternalLink, Images, Plus, Search, Trash2, Tv } from 'lucide-react';
type Show={id:string;slug:string;title:string;tagline:string;description:string;schedule_label:string;host_name:string;frequency:string;category_id:string|null;cover_media_id:string|null;is_active:boolean;position:number};
type Form=Omit<Show,'id'>;
type Medium={id:string;url:string;alt:string};
const blank:Form={slug:'',title:'',tagline:'',description:'',schedule_label:'',host_name:'',frequency:'',category_id:null,cover_media_id:null,is_active:false,position:0};
function slugify(v:string){return v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100)}
export default function ShowsV2(){
 const [items,setItems]=useState<Show[]>([]),[cats,setCats]=useState<{id:string;name:string}[]>([]);
 const [media,setMedia]=useState<Medium[]>([]),[episodeCounts,setEpisodeCounts]=useState<Record<string,number>>({});
 const [form,setForm]=useState<Form>(blank),[editing,setEditing]=useState<string|null>(null);
 const [query,setQuery]=useState(''),[status,setStatus]=useState('all');
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[message,setMessage]=useState('');
 const load=useCallback(async()=>{
  const urls=['/api/admin-v2/shows','/api/admin-v2/categories','/api/admin-v2/episodes','/api/admin-v2/media?pageSize=60'];
  const out=await Promise.all(urls.map(async u=>{const r=await fetch(u,{cache:'no-store'});const j=await r.json();return {ok:r.ok,data:j.data,error:j.error}}));
  if(!out[0].ok||!out[1].ok)throw Error(out[0].error?.message||out[1].error?.message||'Émissions indisponibles');
  setItems(out[0].data?.items||[]);setCats(out[1].data?.items||[]);
  if(out[3].ok)setMedia(out[3].data?.items||[]);
  if(out[2].ok){const c:Record<string,number>={};for(const e of out[2].data?.items||[])c[e.show_id]=(c[e.show_id]||0)+1;setEpisodeCounts(c);}
 },[]);
 useEffect(()=>{load().catch(e=>setError(e.message)).finally(()=>setLoading(false))},[load]);
 function reset(){setForm(blank);setEditing(null)}
 const field=<K extends keyof Form>(k:K,v:Form[K])=>setForm(f=>({...f,[k]:v}));
 function edit(s:Show){const {id,...fields}=s;setEditing(id);setForm(fields);setMessage('')}
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');setMessage('');
  try{const r=await fetch('/api/admin-v2/shows',{method:editing?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(editing?{...form,id:editing}:form)});
   const j=await r.json();if(!r.ok)throw Error(j.error?.message||'Enregistrement refusé');
   reset();await load();setMessage('Émission enregistrée.');
  }catch(e){setError(e instanceof Error?e.message:'Erreur réseau')}finally{setBusy(false)}
 }
 async function remove(s:Show){if(!window.confirm('Supprimer définitivement « '+s.title+' » ?'))return;
  setBusy(true);setError('');try{const r=await fetch('/api/admin-v2/shows',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:s.id})});
   const j=await r.json();if(!r.ok)throw Error(j.error?.message||'Suppression impossible');
   if(editing===s.id)reset();await load();setMessage('Émission supprimée.');
  }catch(e){setError(e instanceof Error?e.message:'Erreur réseau')}finally{setBusy(false)}
 }
 const visible=items.filter(s=>(status==='all'||(status==='online'?s.is_active:!s.is_active))&&(s.title+' '+s.host_name+' '+s.description).toLowerCase().includes(query.toLowerCase()));
 const image=media.find(m=>m.id===form.cover_media_id);
 return <div className="v2-regie">
  <header className="v2-head"><div><p className="v2-newsroom-eyebrow">ANTENNE · PROGRAMMES TV+</p><h1 className="v2-title">Gestion des émissions</h1>
   <p className="v2-lede">Pilotez les fiches programmes, présentateurs, créneaux, visuels et replays associés.</p></div>
   <Link href="/replay-emissions" target="_blank" className="admin-btn admin-btn-ghost">Voir les émissions <ExternalLink size={15}/></Link></header>
  <div className="v2-regie-summary"><div className="v2-card"><Tv size={22}/><p>Émissions</p><strong>{items.length}</strong></div>
   <div className="v2-card"><Tv size={22}/><p>Affichées sur le site</p><strong>{items.filter(x=>x.is_active).length}</strong></div>
   <div className="v2-card"><CalendarDays size={22}/><p>Épisodes associés</p><strong>{Object.values(episodeCounts).reduce((a,b)=>a+b,0)}</strong></div></div>
  {error&&<p className="v2-error" role="alert">{error}</p>}{message&&<p className="v2-success" role="status">{message}</p>}
  <div className="v2-edit-grid">
   <section className="v2-card"><h2 className="v2-panel-title">Catalogue des programmes</h2>
    <div className="v2-regie-filter-row"><label><Search size={17}/><input type="search" aria-label="Rechercher une émission" value={query} placeholder="Rechercher…" onChange={e=>setQuery(e.target.value)}/></label>
     <select value={status} aria-label="Filtrer les émissions" onChange={e=>setStatus(e.target.value)}><option value="all">Toutes</option><option value="online">Publiées</option><option value="offline">Masquées</option></select></div>
    {loading?<p>Chargement…</p>:<div className="v2-regie-channels">
     {visible.map(s=><div className="v2-regie-channel" key={s.id}>
      <div><strong>{s.title}</strong><span>{s.host_name||'Présentateur à préciser'} · {s.schedule_label||'Créneau non défini'}</span>
       <small>{s.is_active?'Visible':'Masquée'} · {episodeCounts[s.id]||0} replay(s) · Position {s.position}</small></div>
      <div className="v2-actions"><button type="button" className="admin-btn admin-btn-ghost" onClick={()=>edit(s)}>Configurer</button>
       <button type="button" className="admin-btn admin-btn-ghost" disabled={busy||Boolean(episodeCounts[s.id])} onClick={()=>void remove(s)} aria-label={'Supprimer '+s.title}><Trash2 size={15}/></button></div>
     </div>)}
     {!visible.length&&<p className="v2-note">Aucune émission trouvée.</p>}
    </div>}</section>
   <section className="v2-card"><h2 className="v2-panel-title">{editing?'Configurer l’émission':'Ajouter une émission'}</h2>
    <form onSubmit={save}>
     <label className="v2-field"><span>Nom du programme *</span><input required minLength={3} maxLength={130} value={form.title} onChange={e=>{const title=e.target.value;setForm(f=>({...f,title,slug:editing?f.slug:slugify(title)}))}}/></label>
     <label className="v2-field"><span>Identifiant du lien</span><input required maxLength={100} disabled={Boolean(editing)} value={form.slug} onChange={e=>field('slug',slugify(e.target.value))}/></label>
     <label className="v2-field"><span>Accroche</span><input maxLength={200} value={form.tagline} onChange={e=>field('tagline',e.target.value)}/></label>
     <label className="v2-field"><span>Présentation de l'émission</span><textarea maxLength={2500} rows={4} value={form.description} onChange={e=>field('description',e.target.value)}/></label>
     <div className="v2-regie-times">
      <label className="v2-field"><span>Présentateur / présentatrice</span><input maxLength={130} value={form.host_name} onChange={e=>field('host_name',e.target.value)}/></label>
      <label className="v2-field"><span>Périodicité</span><input maxLength={130} placeholder="Ex. Hebdomadaire" value={form.frequency} onChange={e=>field('frequency',e.target.value)}/></label>
     </div>
     <label className="v2-field"><span>Créneau d'antenne</span><input maxLength={150} placeholder="Ex. Samedi, 20 h" value={form.schedule_label} onChange={e=>field('schedule_label',e.target.value)}/></label>
     <label className="v2-field"><span>Rubrique</span><select value={form.category_id||''} onChange={e=>field('category_id',e.target.value||null)}><option value="">Non définie</option>{cats.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
     <label className="v2-field"><span><Images size={16}/> Visuel de couverture (médiathèque)</span><select value={form.cover_media_id||''} onChange={e=>field('cover_media_id',e.target.value||null)}><option value="">Aucun visuel</option>{media.map(m=><option key={m.id} value={m.id}>{m.alt||m.id}</option>)}</select></label>
     {image?.url&&<img src={image.url} alt={image.alt||'Couverture de l’émission'} style={{maxWidth:'100%',maxHeight:180,objectFit:'contain'}}/>}
     <label className="v2-field"><span>Ordre sur le site</span><input type="number" min={0} max={32000} value={form.position} onChange={e=>field('position',Number(e.target.value))}/></label>
     <label className="v2-regie-check"><input type="checkbox" checked={form.is_active} onChange={e=>field('is_active',e.target.checked)}/> Afficher le programme sur le site public</label>
     <div className="v2-actions"><button type="submit" disabled={busy} className="admin-btn admin-btn-primary"><Plus size={16}/>{busy?'Enregistrement…':'Enregistrer l’émission'}</button>
      {editing&&<button type="button" onClick={reset} className="admin-btn admin-btn-ghost">Annuler</button>}
      <Link href="/admin-v2/replays" className="admin-btn admin-btn-ghost">Gérer les replays</Link></div>
    </form>
   </section>
  </div></div>;
}
