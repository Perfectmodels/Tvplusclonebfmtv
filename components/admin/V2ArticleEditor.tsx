'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TiptapEditor, { type EditorValue } from '../editor/TiptapEditor';

type Category={id:string;name:string;slug:string};
type Media={id:string;url:string;alt:string;mime_type:string};
type ArticleForm={
  title:string;slug:string;excerpt:string;category_id:string;cover_media_id:string|null;
  seo_title:string;seo_description:string;country_code:string;province_slug:string;
  tags:string[];featured:boolean;is_alert:boolean;
};
const initialForm:ArticleForm={title:'',slug:'',excerpt:'',category_id:'',cover_media_id:null,
  seo_title:'',seo_description:'',country_code:'GA',province_slug:'',tags:[],featured:false,is_alert:false};
const emptyDoc={type:'doc',content:[{type:'paragraph'}]};
const states:Record<string,string>={draft:'Brouillon',in_review:'À valider',approved:'Validé',scheduled:'Programmé',published:'Publié'};
const provinces=['estuaire','haut-ogooue','moyen-ogooue','ngounie','nyanga','ogooue-ivindo','ogooue-lolo','ogooue-maritime','woleu-ntem'];
function slugify(value:string){return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,120)}
export default function V2ArticleEditor({id,actorId,canReview}:{id?:string;actorId:string;canReview:boolean}) {
  const router=useRouter();
  const [form,setForm]=useState<ArticleForm>(initialForm);
  const [content,setContent]=useState<EditorValue>({json:emptyDoc,text:'',words:0});
  const [initialJson,setInitialJson]=useState<unknown>(emptyDoc);
  const [categories,setCategories]=useState<Category[]>([]);
  const [media,setMedia]=useState<Media[]>([]);
  const [loaded,setLoaded]=useState(!id);
  const [saving,setSaving]=useState(false);
  const [uploading,setUploading]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const [status,setStatus]=useState('draft');
  const [updatedAt,setUpdatedAt]=useState('');
  const [ownerId,setOwnerId]=useState(actorId);
  const [dirty,setDirty]=useState(false);
  const [mediaPage,setMediaPage]=useState(1);
  const canEdit=canReview||ownerId===actorId&&['draft','in_review'].includes(status);
  const set=(key:keyof ArticleForm,value:ArticleForm[keyof ArticleForm])=>{
    setForm(f=>({...f,[key]:value}));setDirty(true);setSuccess('');
  };
  useEffect(()=>{
    let alive=true;
    Promise.all([
      fetch('/api/admin-v2/categories',{cache:'no-store'}).then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error?.message??'Rubriques indisponibles');return b.data.items as Category[]}),
      fetch('/api/admin-v2/media?pageSize=60',{cache:'no-store'}).then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.error?.message??'Médiathèque indisponible');return b.data.items as Media[]}),
    ]).then(([cats,med])=>{if(alive){setCategories(cats);setMedia(med)}}).catch(e=>{if(alive)setError(e.message)});
    if(id)fetch('/api/admin-v2/articles/'+id,{cache:'no-store'}).then(async r=>{
      const b=await r.json();if(!r.ok)throw Error(b.error?.message??'Article inaccessible');return b.data;
    }).then(a=>{if(!alive)return;
      setForm({title:a.title,slug:a.slug,excerpt:a.excerpt??'',category_id:a.category_id,
        cover_media_id:a.cover_media_id,seo_title:a.seo_title??'',seo_description:a.seo_description??'',
        country_code:a.country_code??'GA',province_slug:a.province_slug??'',tags:a.tags??[],
        featured:Boolean(a.featured),is_alert:Boolean(a.is_alert)});
      setInitialJson(a.content_json??emptyDoc);
      setContent({json:a.content_json??emptyDoc,text:'',words:0});
      setStatus(a.status);setOwnerId(a.author_id);setUpdatedAt(a.updated_at);setDirty(false);setLoaded(true);
    }).catch(e=>{if(alive){setError(e.message);setLoaded(true)}});
    return()=>{alive=false};
  },[id]);
  const cover=useMemo(()=>media.find(m=>m.id===form.cover_media_id),[media,form.cover_media_id]);
  const chosenMedia=useMemo(()=>media.slice(0,mediaPage*18),[media,mediaPage]);

  const save=useCallback(async():Promise<{id:string;slug:string;updated_at:string}|null>=>{
    if(!canEdit){setError('Vous ne pouvez pas modifier cet article.');return null;}
    if(!form.category_id||!form.title.trim()||!form.slug.trim()){setError('Titre, lien et rubrique sont requis.');return null;}
    if(!content.json||typeof content.json!=='object'){setError('Le contenu de l’article est invalide.');return null;}
    setSaving(true);setError('');setSuccess('');
    try {
      const body={...form,cover_media_id:form.cover_media_id||null,province_slug:form.province_slug||null,
        seo_title:form.seo_title||null,seo_description:form.seo_description||null,content_json:content.json,
        expected_updated_at:updatedAt};
      const url=id?'/api/admin-v2/articles/'+id:'/api/admin-v2/articles';
      const response=await fetch(url,{method:id?'PATCH':'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
      const parsed=await response.json();
      if(!response.ok)throw new Error(parsed.error?.message??'Enregistrement impossible.');
      setUpdatedAt(parsed.data.updated_at);setStatus(parsed.data.status);setDirty(false);
      setSuccess('Article enregistré dans Supabase.');
      if(!id)router.replace('/admin-v2/articles/'+parsed.data.id+'/edit');
      return parsed.data;
    }catch(e){setError(e instanceof Error?e.message:'Erreur réseau');return null}
    finally{setSaving(false)}
  },[canEdit,form,content.json,updatedAt,id,router]);

  async function workflow(action:'submit'|'approve'|'publish'|'revert') {
    if(!id)return;
    if(action==='publish'&&!window.confirm('Publier cet article sur le site public ?'))return;
    let version=updatedAt;
    if(dirty){const saved=await save();if(!saved)return;version=saved.updated_at;}
    setSaving(true);setError('');setSuccess('');
    try{
      const r=await fetch('/api/admin-v2/articles/'+id+'/workflow',{method:'POST',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({action,expected_updated_at:version}),cache:'no-store'});
      const body=await r.json();if(!r.ok)throw new Error(body.error?.message??'Action impossible');
      setStatus(body.data.status);setUpdatedAt(body.data.updated_at);
      setSuccess('Nouveau statut : '+(states[body.data.status]??body.data.status)+'.');
    }catch(e){setError(e instanceof Error?e.message:'Erreur réseau')}
    finally{setSaving(false)}
  }
  async function upload(file:File) {
    setError('');setUploading(true);
    try{
      const body=new FormData();body.append('file',file);body.append('alt',form.title||file.name);
      const r=await fetch('/api/admin-v2/media',{method:'POST',body,cache:'no-store'});
      const j=await r.json();if(!r.ok)throw Error(j.error?.message??'Téléversement impossible');
      const item=j.data as Media;
      setMedia(m=>[item,...m]);set('cover_media_id',item.id);
      setSuccess('Couverture créée en 1200 × 630 et enregistrée dans la médiathèque.');
    }catch(e){setError(e instanceof Error?e.message:'Erreur image')}
    finally{setUploading(false)}
  }
  return <div>
    <div className="v2-head"><div><Link href="/admin-v2/articles" className="admin-link">← Tous les articles</Link>
      <h1 className="v2-title">{id?'Modifier l’article':'Nouvel article'}</h1>
      <p className="v2-lede">{states[status]??status} {dirty?'· Modifications non enregistrées':''}</p></div>
      <div className="v2-actions"><button type="button" className="admin-btn admin-btn-primary" disabled={saving||!loaded||!canEdit} onClick={()=>save()}>{saving?'Enregistrement…':'Enregistrer'}</button>
        {id&&canEdit&&['draft','in_review'].includes(status)&&<button className="admin-btn admin-btn-ghost" disabled={saving} onClick={()=>workflow('submit')}>Soumettre</button>}
        {id&&canReview&&status==='in_review'&&<button className="admin-btn admin-btn-ghost" disabled={saving} onClick={()=>workflow('approve')}>Valider</button>}
        {id&&canReview&&status!=='published'&&<button className="admin-btn admin-btn-primary" disabled={saving} onClick={()=>workflow('publish')}>Publier</button>}
        {id&&canReview&&status==='published'&&<button className="admin-btn admin-btn-ghost" disabled={saving} onClick={()=>workflow('revert')}>Dépublier</button>}
      </div>
    </div>
    {error&&<div className="v2-error" role="alert">{error}</div>}
    {success&&<div className="v2-success" role="status">{success}</div>}
    {!loaded?<div className="v2-card" role="status">Chargement de l’article…</div>:
    <div className="v2-edit-grid">
      <section className="v2-card">
        <label className="v2-field"><span>Titre de l’article *</span><input maxLength={220} required value={form.title} disabled={!canEdit} onChange={e=>{const title=e.target.value;setForm(f=>({...f,title,slug:id?f.slug:slugify(title)}));setDirty(true)}}/></label>
        <label className="v2-field"><span>Lien court *</span><input maxLength={120} required value={form.slug} disabled={!canEdit} onChange={e=>set('slug',slugify(e.target.value))}/><small>URL publique : /article/{form.slug||'titre-de-larticle'}</small></label>
        <label className="v2-field"><span>Résumé / chapô</span><textarea maxLength={2000} value={form.excerpt} disabled={!canEdit} onChange={e=>set('excerpt',e.target.value)} /></label>
        <h2 className="v2-panel-title">Contenu de l’article</h2>
        <TiptapEditor initialJson={initialJson} onChange={value=>{setContent(value);setDirty(true)}} autosaveHint="Cliquez sur Enregistrer pour sauvegarder."/>
      </section>
      <aside className="v2-card">
        <h2 className="v2-panel-title">Publication et référencement</h2>
        <label className="v2-field"><span>Rubrique *</span><select value={form.category_id} disabled={!canEdit} onChange={e=>set('category_id',e.target.value)}><option value="">Choisir une rubrique</option>{categories.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
        <label className="v2-field"><span>Pays (ISO)</span><input maxLength={2} value={form.country_code} disabled={!canEdit} onChange={e=>set('country_code',e.target.value.toUpperCase())}/></label>
        {form.country_code==='GA'&&<label className="v2-field"><span>Province</span><select value={form.province_slug} disabled={!canEdit} onChange={e=>set('province_slug',e.target.value)}><option value="">Toutes les provinces</option>{provinces.map(p=><option key={p} value={p}>{p}</option>)}</select></label>}
        <label className="v2-field"><span>SEO — titre</span><input maxLength={200} disabled={!canEdit} value={form.seo_title} onChange={e=>set('seo_title',e.target.value)}/></label>
        <label className="v2-field"><span>SEO — description</span><textarea maxLength={320} disabled={!canEdit} value={form.seo_description} onChange={e=>set('seo_description',e.target.value)}/></label>
        <label className="v2-field"><span>Mots-clés (séparés par des virgules)</span><input disabled={!canEdit} value={form.tags.join(', ')} onChange={e=>set('tags',e.target.value.split(',').map(s=>s.trim()).filter(Boolean).slice(0,20))}/></label>
        <label className="v2-field"><span><input type="checkbox" checked={form.featured} disabled={!canEdit} onChange={e=>set('featured',e.target.checked)}/> À la une</span></label>
        <label className="v2-field"><span><input type="checkbox" checked={form.is_alert} disabled={!canEdit} onChange={e=>set('is_alert',e.target.checked)}/> Alerte info</span></label>
        <h2 className="v2-panel-title">Image de couverture · 1200 × 630</h2>
        {cover&&<img src={cover.url} alt={cover.alt||'Couverture'} style={{width:'100%',aspectRatio:'1200/630',objectFit:'contain'}}/>}
        {!cover&&form.cover_media_id&&<p className="v2-note">Couverture existante sélectionnée. Elle n’apparaît pas dans les derniers médias.</p>}
        <label className="v2-field"><span>Importer une image (JPEG, PNG, WebP ou AVIF ; 4 Mo max)</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={!canEdit||uploading}
            onChange={e=>{const file=e.target.files?.[0];if(file)upload(file);e.target.value=''}}/>
          {uploading&&<small role="status">Optimisation et envoi…</small>}
        </label>
        <div className="v2-image-grid">{chosenMedia.map(m=><button key={m.id} type="button" disabled={!canEdit} className="v2-image-choice" aria-pressed={form.cover_media_id===m.id} title={m.alt||'Choisir cette image'} onClick={()=>set('cover_media_id',m.id)}>
          <img src={m.url} alt={m.alt||'Image de la médiathèque'} loading="lazy"/></button>)}</div>
        {media.length>chosenMedia.length&&<button className="admin-btn admin-btn-ghost" type="button" onClick={()=>setMediaPage(p=>p+1)}>Afficher plus d’images</button>}
      </aside>
    </div>}
  </div>;
}
