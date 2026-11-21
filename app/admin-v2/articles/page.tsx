'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import V2ArticleThumb from '../../../components/admin/V2ArticleThumb';
import {
  Archive, ArrowDownUp, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight,
  Edit3, ExternalLink, FileText,
  Plus, RotateCcw, Search, ShieldCheck, SlidersHorizontal, ToggleLeft, ToggleRight, X,
} from 'lucide-react';

type Article = {
  id: string; slug: string; short_code: string; title: string; excerpt: string;
  status: string; category_id: string; category_name: string; author_name: string;
  publisher_name: string | null; cover_url: string | null; cover_alt: string;
  featured: boolean; is_alert: boolean; updated_at: string; created_at: string;
  published_at: string | null;
};
type ArticleStats = { total: number; counts: Record<string,number> };
type Category = {id: string; name:string};
type Action = 'publish'|'deactivate'|'activate'|'archive'|'restore'|'schedule'|'revert';
const labels:Record<string,string> = {
  draft:'Brouillon',in_review:'En validation',approved:'Validé',scheduled:'Programmé',
  published:'En ligne',inactive:'Hors ligne',archived:'Archivé',
};
const filters=[
  {key:'',label:'Tous les articles'},
  {key:'published',label:'En ligne'},
  {key:'draft',label:'Brouillons'},
  {key:'in_review',label:'En validation'},
  {key:'approved',label:'Validés'},
  {key:'scheduled',label:'Programmés'},
  {key:'inactive',label:'Hors ligne'},
  {key:'archived',label:'Archives'},
];
const timeFormat = new Intl.DateTimeFormat('fr-FR',{
  timeZone:'Africa/Libreville',day:'2-digit',month:'short',year:'numeric',
  hour:'2-digit',minute:'2-digit',
});
function displayDate(value:string|null|undefined) {
  if (!value) return 'Non définie';
  const date=new Date(value);return Number.isNaN(date.valueOf())?'Non définie':timeFormat.format(date);
}
function nextGabonHour() {
  // UTC+01 sans heure d’été : les dates saisies sont celles de Libreville.
  return new Date(Date.now()+2*60*60_000).toISOString().slice(0,16);
}

export default function AdminV2Articles() {
  const [items,setItems]=useState<Article[]>([]);
  const [stats,setStats]=useState<ArticleStats>({total:0,counts:{}});
  const [categories,setCategories]=useState<Category[]>([]);
  const [authors,setAuthors]=useState<{id:string;name:string}[]>([]);
  const [author,setAuthor]=useState('');
  const [q,setQ]=useState('');
  const [filter,setFilter]=useState('');
  const [category,setCategory]=useState('');
  const [sort,setSort]=useState('updated');
  const [page,setPage]=useState(1);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busyId,setBusyId]=useState<string|null>(null);
  const [version,setVersion]=useState(0);
  const [scheduling,setScheduling]=useState<Article|null>(null);
  const [scheduleLocal,setScheduleLocal]=useState(nextGabonHour);
  const [canReview,setCanReview]=useState(false);

  const refresh=useCallback(()=>setVersion(v=>v+1),[]);
  useEffect(()=>{
    const initial=new URLSearchParams(window.location.search).get('status');
    if(initial && filters.some(tab=>tab.key===initial)) setFilter(initial);
  },[]);
  useEffect(()=>{
    let live=true;
    Promise.all([
      fetch('/api/admin-v2/articles/stats',{cache:'no-store'}).then(r=>r.json()),
      fetch('/api/admin-v2/categories',{cache:'no-store'}).then(r=>r.json()),
      fetch('/api/admin-v2/me',{cache:'no-store'}).then(r=>r.json()).catch(()=>null),
      fetch('/api/admin-v2/articles/authors',{cache:'no-store'}).then(r=>r.json()).catch(()=>null),
    ]).then(([summary,cats,me,authorsResult])=>{
      if(!live)return;
      if(summary.data)setStats(summary.data);
      if(cats.data?.items)setCategories(cats.data.items);
      if(me?.data?.permissions)setCanReview(me.data.permissions.includes('articles.review'));
      if(authorsResult?.data?.items)setAuthors(authorsResult.data.items);
    }).catch(()=>{});
    return ()=>{live=false};
  },[version]);

  useEffect(()=>{
    const controller=new AbortController();
    const timer=window.setTimeout(async()=>{
      try{
        setLoading(true);setError('');
        const params=new URLSearchParams({page:String(page),status:filter,q,category,author,sort});
        const res=await fetch('/api/admin-v2/articles?'+params.toString(),{
          signal:controller.signal,cache:'no-store',
        });
        const result=await res.json();
        if(!res.ok)throw new Error(result.error?.message??'Impossible de charger les articles.');
        if(!controller.signal.aborted){setItems(result.data.items??[]);setTotal(result.data.total??0);}
      }catch(e){
        if(!controller.signal.aborted){setError(e instanceof Error?e.message:'Erreur de connexion');setItems([]);}
      }finally{if(!controller.signal.aborted)setLoading(false)}
    },q?280:0);
    return ()=>{controller.abort();clearTimeout(timer)};
  },[page,q,filter,category,author,sort,version]);

  async function act(article:Article,action:Action,scheduled_at?:string) {
    const prompts:Partial<Record<Action,string>>={
      publish:'Mettre cet article en ligne maintenant ?',
      deactivate:'Retirer cet article du site public ? Il restera disponible dans la rédaction.',
      activate:'Remettre cet article en ligne maintenant ?',
      archive:'Archiver cet article ? Il ne sera plus affiché sur le site public.',
      restore:'Restaurer cet article dans votre espace rédactionnel ?',
      revert:'Annuler cette programmation et remettre l’article en brouillon ?',
    };
    if(prompts[action]&&!window.confirm(prompts[action]))return;
    setBusyId(article.id);setError('');setNotice('');
    try{
      const res=await fetch('/api/admin-v2/articles/'+article.id+'/workflow',{
        method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',
        body:JSON.stringify({
          action,expected_updated_at:article.updated_at,...(scheduled_at?{scheduled_at}:{}),
        }),
      });
      const data=await res.json();
      if(!res.ok)throw new Error(data.error?.message??'Action impossible');
      const messages:Record<Action,string>={
        publish:'Article mis en ligne.',deactivate:'Article retiré du site public.',
        activate:'Article remis en ligne.',archive:'Article archivé.',restore:'Article restauré.',
        revert:'Programmation annulée.',schedule:'Publication programmée.',
      };
      setNotice(messages[action]);setScheduling(null);refresh();
    }catch(e){setError(e instanceof Error?e.message:'Action impossible.');}
    finally{setBusyId(null)}
  }

  function confirmSchedule() {
    if(!scheduling)return;
    const date=new Date(scheduleLocal+':00+01:00');
    if(Number.isNaN(date.valueOf())||date.getTime()<Date.now()+60_000) {
      setError('Choisissez une date future (heure de Libreville), à au moins une minute.');
      return;
    }
    void act(scheduling,'schedule',date.toISOString());
  }

  const number=(status:string)=>stats.counts[status]??0;
  const totalPages=Math.max(1,Math.ceil(total/18));
  const statsCards=[
    {key:'published',label:'En ligne',icon:CheckCircle2},
    {key:'draft',label:'Brouillons',icon:FileText},
    {key:'in_review',label:'À valider',icon:ShieldCheck},
    {key:'scheduled',label:'Programmés',icon:CalendarClock},
    {key:'inactive',label:'Hors ligne',icon:ToggleLeft},
    {key:'archived',label:'Archives',icon:Archive},
  ];
  const start=total===0?0:(page-1)*18+1;
  const end=Math.min(page*18,total);

  return (
    <div className="v2-newsroom-articles">
      <header className="v2-newsroom-page-header">
        <div>
          <p className="v2-newsroom-eyebrow">ESPACE RÉDACTION · PILOTAGE ÉDITORIAL</p>
          <h1>Gestion des articles</h1>
          <p>Suivez les publications, validez les contenus et organisez les prochaines mises en ligne.</p>
        </div>
        <Link className="v2-newsroom-primary" href="/admin-v2/articles/new"><Plus size={18}/> Nouvel article</Link>
      </header>

      <div className="v2-newsroom-stats" aria-label="Indicateurs des articles">
        <button type="button" className="v2-newsroom-stat" aria-pressed={!filter}
          onClick={()=>{setFilter('');setPage(1)}}>
          <span>Ensemble des articles</span><strong>{stats.total.toLocaleString('fr-FR')}</strong>
          <small>Tous les contenus enregistrés</small>
        </button>
        {statsCards.map(card=>{const Icon=card.icon;return (
          <button type="button" key={card.key}
            aria-pressed={filter===card.key} className="v2-newsroom-stat"
            onClick={()=>{setFilter(card.key);setPage(1)}}>
            <span><Icon size={15}/>{card.label}</span>
            <strong>{number(card.key).toLocaleString('fr-FR')}</strong>
            <small>{card.key==='published'?'Visibles sur le site':'Dans cet état éditorial'}</small>
          </button>
        )})}
      </div>

      <section className="v2-newsroom-list-panel" aria-labelledby="v2-newsroom-list-title">
        <div className="v2-newsroom-list-top">
          <div><h2 id="v2-newsroom-list-title">Bibliothèque des articles</h2>
            <p>Titres, visuels, auteurs et statut de diffusion</p></div>
          <span className="v2-newsroom-result-count">{total.toLocaleString('fr-FR')} résultat{total>1?'s':''}</span>
        </div>
        <div className="v2-newsroom-tabstrip" role="group" aria-label="Filtrer les articles par état">
          {filters.map(tab=><button type="button" key={tab.key}
            className={filter===tab.key?'is-active':''} aria-pressed={filter===tab.key}
            onClick={()=>{setFilter(tab.key);setPage(1)}}>
            {tab.label}
            {(tab.key===''?stats.total:number(tab.key))>0&&
              <span>{tab.key===''?stats.total:number(tab.key)}</span>}
          </button>)}
        </div>
        <div className="v2-newsroom-filters">
          <label className="v2-newsroom-search">
            <Search size={18} aria-hidden="true"/>
            <input aria-label="Rechercher un article" type="search"
              value={q} placeholder="Rechercher un article par son titre…"
              onChange={e=>{setQ(e.target.value);setPage(1)}}/>
            {q&&<button type="button" aria-label="Effacer la recherche" onClick={()=>{setQ('');setPage(1)}}><X size={15}/></button>}
          </label>
          <label className="v2-newsroom-select"><SlidersHorizontal size={16} aria-hidden="true"/>
            <select aria-label="Filtrer par rubrique" value={category}
              onChange={e=>{setCategory(e.target.value);setPage(1)}}>
              <option value="">Toutes les rubriques</option>
              {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select></label>
          <label className="v2-newsroom-select"><FileText size={16} aria-hidden="true"/>
            <select aria-label="Filtrer par auteur" value={author}
              onChange={e=>{setAuthor(e.target.value);setPage(1)}}>
              <option value="">Tous les auteurs</option>
              {authors.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
            </select></label>
          <label className="v2-newsroom-select"><ArrowDownUp size={16} aria-hidden="true"/>
            <select aria-label="Trier les articles" value={sort} onChange={e=>{setSort(e.target.value);setPage(1)}}>
              <option value="updated">Dernières modifications</option>
              <option value="published">Dernières publications</option>
              <option value="created">Derniers articles créés</option>
            </select></label>
          <button type="button" title="Actualiser la liste" className="v2-newsroom-refresh" onClick={refresh}>
            <RotateCcw size={17}/> Actualiser
          </button>
        </div>
        {error&&<div className="v2-error" role="alert">{error}</div>}
        {notice&&<div className="v2-success" role="status">{notice}</div>}
        {loading?<div className="v2-newsroom-loading" role="status">Chargement de la bibliothèque éditoriale…</div>:
          items.length===0?<div className="v2-newsroom-empty">
            <FileText size={36}/><h3>Aucun article trouvé</h3>
            <p>Modifiez les filtres ou créez un nouvel article.</p>
            <button type="button" className="v2-newsroom-inline-link"
              onClick={()=>{setQ('');setFilter('');setCategory('');setAuthor('');setPage(1)}}>Réinitialiser les filtres</button>
          </div>:
          <div className="v2-newsroom-story-list">
            {items.map(a=>{
              const busy=busyId===a.id;
              const online=a.status==='published';
              const href='/a/'+a.short_code;
              return (
                <article key={a.id} className={'v2-newsroom-story'+(busy?' is-busy':'')}>
                  <Link href={'/admin-v2/articles/'+a.id+'/edit'} className="v2-newsroom-story-image"
                    aria-label={'Modifier '+a.title}>
                    <V2ArticleThumb src={a.cover_url} alt={a.cover_alt||''}/>
                  </Link>
                  <div className="v2-newsroom-story-details">
                    <div className="v2-newsroom-story-kicker">
                      <span>{a.category_name}</span>
                      <span className={'v2-newsroom-status status-'+a.status}>
                        <span aria-hidden="true" />{labels[a.status]??'À vérifier'}
                      </span>
                      {a.featured&&<span className="v2-newsroom-featured">À la une</span>}
                    </div>
                    <h3><Link href={'/admin-v2/articles/'+a.id+'/edit'}>{a.title}</Link></h3>
                    <p>{a.excerpt||'Aucun chapeau rédigé.'}</p>
                    <div className="v2-newsroom-story-meta">
                      <span>Par <strong>{a.author_name}</strong></span>
                      <span>{a.status==='scheduled'?'Prévu le ':online?'Publié le ':'Modifié le '}
                        {displayDate(a.status==='scheduled'||online?a.published_at:a.updated_at)}
                      </span>
                      {a.publisher_name&&a.publisher_name!==a.author_name&&
                        <span>Mise en ligne : {a.publisher_name}</span>}
                    </div>
                  </div>
                  <div className="v2-newsroom-story-actions">
                    <Link href={'/admin-v2/articles/'+a.id+'/edit'} className="v2-newsroom-action edit">
                      <Edit3 size={15}/> Modifier
                    </Link>
                    {canReview&&(online?
                      <button type="button" disabled={busy} className="v2-newsroom-action"
                        onClick={()=>void act(a,'deactivate')}><ToggleLeft size={16}/> Désactiver</button>:
                      a.status==='inactive'?
                      <button type="button" disabled={busy} className="v2-newsroom-action activate"
                        onClick={()=>void act(a,'activate')}><ToggleRight size={16}/> Activer</button>:
                      a.status==='archived'?
                      <button type="button" disabled={busy} className="v2-newsroom-action"
                        onClick={()=>void act(a,'restore')}><RotateCcw size={15}/> Restaurer</button>:
                      a.status==='scheduled'?
                      <button type="button" disabled={busy} className="v2-newsroom-action"
                        onClick={()=>void act(a,'revert')}><RotateCcw size={15}/> Annuler</button>:
                      <button type="button" disabled={busy} className="v2-newsroom-action activate"
                        onClick={()=>void act(a,'publish')}><ToggleRight size={16}/> Mettre en ligne</button>)}
                    {canReview&&['draft','in_review','approved','inactive','scheduled'].includes(a.status)&&
                      <button type="button" disabled={busy} className="v2-newsroom-action"
                        onClick={()=>{setScheduling(a);setScheduleLocal(nextGabonHour())}}>
                        <CalendarClock size={15}/> Programmer
                      </button>}
                    {canReview&&a.status!=='archived'&&
                      <button type="button" disabled={busy} className="v2-newsroom-action archive"
                        onClick={()=>void act(a,'archive')}><Archive size={15}/> Archiver</button>}
                    {online?<a className="v2-newsroom-action view" href={href} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={15}/> Voir l’article</a>:
                      <span className="v2-newsroom-action-disabled"><ExternalLink size={15}/> Non public</span>}
                  </div>
                </article>
              );
            })}
          </div>}
        <footer className="v2-newsroom-list-footer">
          <span>{start}–{end} sur {total.toLocaleString('fr-FR')} articles</span>
          <div className="v2-newsroom-pager">
            <button type="button" disabled={loading||page<=1} onClick={()=>setPage(v=>v-1)}
              aria-label="Page précédente"><ChevronLeft size={17}/></button>
            <span>Page {page} / {totalPages}</span>
            <button type="button" disabled={loading||page>=totalPages} onClick={()=>setPage(v=>v+1)}
              aria-label="Page suivante"><ChevronRight size={17}/></button>
          </div>
        </footer>
      </section>

      {scheduling&&<div className="v2-newsroom-modal-backdrop" role="presentation"
        onClick={()=>setScheduling(null)}>
        <div className="v2-newsroom-modal" role="dialog" aria-modal="true"
          aria-labelledby="v2-newsroom-schedule-title" onClick={e=>e.stopPropagation()}>
          <header><div><p>CALENDRIER ÉDITORIAL</p><h2 id="v2-newsroom-schedule-title">Programmer la publication</h2></div>
            <button type="button" aria-label="Fermer" onClick={()=>setScheduling(null)}><X size={20}/></button></header>
          <p className="v2-newsroom-modal-article">{scheduling.title}</p>
          <label>Jour et heure de mise en ligne
            <input type="datetime-local" value={scheduleLocal}
              onChange={e=>setScheduleLocal(e.target.value)}/></label>
          <small>Fuseau horaire : Libreville, Gabon (UTC+01). L’article sera mis en ligne automatiquement.</small>
          <footer>
            <button type="button" className="v2-newsroom-action" onClick={()=>setScheduling(null)}>Annuler</button>
            <button type="button" className="v2-newsroom-primary" disabled={busyId===scheduling.id}
              onClick={confirmSchedule}><CalendarClock size={16}/> Confirmer la programmation</button>
          </footer>
        </div>
      </div>}
    </div>
  );
}
