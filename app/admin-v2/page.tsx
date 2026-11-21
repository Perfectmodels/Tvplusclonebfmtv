import Link from 'next/link';
import {
  Activity, Archive, ArrowUpRight, BarChart3, CalendarClock,
  CheckCircle2, ChevronRight, Clock3, FilePenLine, FileText,
  Images, Layers3, Plus, ShieldCheck, UsersRound,
} from 'lucide-react';
import { requireV2Page } from '../../lib/auth/v2-admin';
import { createAuthClient } from '../../lib/auth/server';
import { enrichArticleRows, type ArticleAdminRow } from '../../lib/admin-v2/article-records';

export const dynamic='force-dynamic';

const LABELS:Record<string,string>={
  published:'En ligne',draft:'Brouillon',in_review:'En validation',
  approved:'Validé',scheduled:'Programmé',inactive:'Hors ligne',archived:'Archivé',
};
const zone='Africa/Libreville';
const datetime=new Intl.DateTimeFormat('fr-FR',{
  timeZone:zone,day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',
});
const dayLabel=new Intl.DateTimeFormat('fr-FR',{timeZone:zone,weekday:'short',day:'2-digit'});
const number=(value:number|null|undefined)=>typeof value==='number'?value.toLocaleString('fr-FR'):'—';
const dateText=(value:string|null|undefined)=>value?datetime.format(new Date(value)):'Date inconnue';

export default async function DashboardV2() {
  const actor=await requireV2Page();
  const db=await createAuthClient();
  const now=new Date();
  // Libreville est à UTC+1 toute l'année : minuit local n'est pas minuit UTC.
  const gabonNow=new Date(now.getTime()+60*60_000);
  const startToday=new Date(Date.UTC(
    gabonNow.getUTCFullYear(),gabonNow.getUTCMonth(),gabonNow.getUTCDate(),
  )-60*60_000);
  const startWeek=new Date(startToday.getTime()-6*24*60*60_000);
  const startMonth=new Date(now.getTime()-30*24*60*60_000);
  const counts:Record<string,number>={};
  const statuses=['published','draft','in_review','approved','scheduled','inactive','archived'];

  const [totals,recentResult,liveResult,scheduledResult,monthResult,weekResult,
    todayResult,mediaResult,categoryResult,activityResult]=await Promise.all([
    Promise.all([
      db.from('articles').select('id',{head:true,count:'exact'}),
      ...statuses.map(status=>db.from('articles').select('id',{head:true,count:'exact'}).eq('status',status)),
    ]),
    db.from('articles').select(
      'id,slug,short_code,title,excerpt,status,category_id,cover_media_id,author_id,reviewed_by,updated_at,created_at,published_at'
    ).order('updated_at',{ascending:false}).limit(8),
    db.from('articles').select(
      'id,slug,short_code,title,excerpt,status,category_id,cover_media_id,author_id,reviewed_by,updated_at,created_at,published_at'
    ).eq('status','published').order('published_at',{ascending:false}).limit(7),
    db.from('articles').select(
      'id,slug,short_code,title,excerpt,status,category_id,cover_media_id,author_id,reviewed_by,updated_at,created_at,published_at'
    ).eq('status','scheduled').gte('published_at',now.toISOString())
      .order('published_at',{ascending:true}).limit(6),
    db.from('articles').select('id,author_id,category_id,published_at')
      .eq('status','published').gte('published_at',startMonth.toISOString())
      .order('published_at',{ascending:false}).limit(2500),
    db.from('articles').select('id',{head:true,count:'exact'})
      .eq('status','published').gte('published_at',startWeek.toISOString()),
    db.from('articles').select('id',{head:true,count:'exact'})
      .eq('status','published').gte('published_at',startToday.toISOString()),
    db.from('media').select('id',{head:true,count:'exact'}),
    db.from('categories').select('id,name').order('position'),
    actor.permissions.includes('audit.read')
      ? db.from('audit_logs').select('id,actor_id,action,entity_id,details,created_at')
        .eq('entity','articles').order('created_at',{ascending:false}).limit(7)
      : Promise.resolve({data:[],error:null}),
  ]);

  statuses.forEach((status,index)=>counts[status]=totals[index+1]?.count??0);
  const total=totals[0]?.count??0;
  const baseRows=[
    ...((recentResult.data??[]) as ArticleAdminRow[]),
    ...((liveResult.data??[]) as ArticleAdminRow[]),
    ...((scheduledResult.data??[]) as ArticleAdminRow[]),
  ];
  const index=await enrichArticleRows(db,Array.from(new Map(baseRows.map(r=>[r.id,r])).values()));
  const articleMap=new Map(index.map(item=>[item.id,item]));
  const recent=((recentResult.data??[]) as ArticleAdminRow[]).map(row=>articleMap.get(row.id)!).filter(Boolean);
  const live=((liveResult.data??[]) as ArticleAdminRow[]).map(row=>articleMap.get(row.id)!).filter(Boolean);
  const scheduled=((scheduledResult.data??[]) as ArticleAdminRow[]).map(row=>articleMap.get(row.id)!).filter(Boolean);
  const month=monthResult.data??[];
  const allAuthors=[...new Set(month.map(row=>row.author_id))];
  const {data:profiles}=allAuthors.length
    ? await db.from('profiles').select('id,full_name').in('id',allAuthors)
    : {data:[] as {id:string;full_name:string|null}[]};
  const authorNames=new Map((profiles??[]).map(a=>[a.id,a.full_name||'Rédaction TV+']));
  const authorCounts=new Map<string,number>();
  const categoryCounts=new Map<string,number>();
  month.forEach(row=>{
    authorCounts.set(row.author_id,(authorCounts.get(row.author_id)??0)+1);
    categoryCounts.set(row.category_id,(categoryCounts.get(row.category_id)??0)+1);
  });
  const authors=[...authorCounts].sort((a,b)=>b[1]-a[1]).slice(0,5);
  const categoryNames=new Map((categoryResult.data??[]).map(c=>[c.id,c.name]));
  const topCategories=[...categoryCounts].sort((a,b)=>b[1]-a[1]).slice(0,5);
  const maxCategory=Math.max(1,...topCategories.map(item=>item[1]));
  const calendarKey=new Intl.DateTimeFormat('sv-SE',{
    timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',
  });
  const perDay=new Map<string,number>();
  for(const item of month){
    if(!item.published_at)continue;
    const key=calendarKey.format(new Date(item.published_at));
    perDay.set(key,(perDay.get(key)??0)+1);
  }
  const dayBars=Array.from({length:7},(_,i)=>{
    const date=new Date(startWeek.getTime()+i*24*60*60_000);
    const key=calendarKey.format(date);
    const value=perDay.get(key)??0;
    return {date,label:dayLabel.format(date),value};
  });
  const maxDay=Math.max(1,...dayBars.map(day=>day.value));
  const audit=activityResult.data??[];

  const kpis=[
    {label:'Articles en ligne',value:counts.published,icon:CheckCircle2,help:'Consultables sur le site',href:'/admin-v2/articles?status=published',tone:'positive'},
    {label:'Publications du jour',value:todayResult.count??0,icon:Activity,help:'Depuis minuit à Libreville',href:'/admin-v2/articles?status=published',tone:'blue'},
    {label:'À valider',value:counts.in_review,icon:ShieldCheck,help:'À traiter par la rédaction',href:'/admin-v2/articles?status=in_review',tone:'amber'},
    {label:'Programmés',value:counts.scheduled,icon:CalendarClock,help:'Mises en ligne à venir',href:'/admin-v2/articles?status=scheduled',tone:'violet'},
    {label:'Brouillons',value:counts.draft,icon:FilePenLine,help:'En cours de rédaction',href:'/admin-v2/articles?status=draft',tone:'slate'},
    {label:'Hors ligne / archives',value:counts.inactive+counts.archived,icon:Archive,help:'Non visibles des lecteurs',href:'/admin-v2/articles?status=inactive',tone:'slate'},
  ];
  return <div className="v2-newsroom-dashboard">
    <header className="v2-newsroom-page-header">
      <div><p className="v2-newsroom-eyebrow">TV+ AFRIQUE · DIRECTION ÉDITORIALE</p>
        <h1>Vue générale</h1>
        <p>Activité rédactionnelle, publications et pilotage des contenus.</p></div>
      <div className="v2-dashboard-header-actions">
        <Link href="/admin-v2/articles" className="v2-newsroom-secondary"><FileText size={17}/> Gérer les articles</Link>
        {actor.permissions.includes('articles.create')&&
          <Link href="/admin-v2/articles/new" className="v2-newsroom-primary"><Plus size={18}/> Nouvel article</Link>}
      </div>
    </header>
    <section aria-label="Indicateurs clés" className="v2-dashboard-kpis">
      {kpis.map(item=>{const Icon=item.icon;return <Link href={item.href}
        key={item.label} className={'v2-dashboard-kpi tone-'+item.tone}>
        <span className="v2-dashboard-kpi-head"><span>{item.label}</span><Icon size={20}/></span>
        <strong>{number(item.value)}</strong><small>{item.help}</small>
        <ChevronRight size={16} className="v2-dashboard-kpi-arrow"/>
      </Link>})}
    </section>

    <div className="v2-dashboard-figures">
      <section className="v2-dashboard-panel v2-dashboard-activity" aria-labelledby="v2-week-title">
        <header><div><p className="v2-dashboard-eyebrow">PUBLICATION</p>
          <h2 id="v2-week-title">Activité des 7 derniers jours</h2>
          <p>Articles mis en ligne, par jour, heure de Libreville.</p></div>
          <strong className="v2-dashboard-total">{number(weekResult.count)} <span>publications</span></strong>
        </header>
        <div className="v2-dashboard-chart" role="img" aria-label="Publications par jour sur les sept derniers jours">
          {dayBars.map(day=><div key={day.label} className="v2-dashboard-bar-column"
            title={day.label+' : '+day.value+' publication(s)'}>
            <span className="v2-dashboard-bar-count">{day.value}</span>
            <div className="v2-dashboard-bar-space">
              <div style={{height:day.value?Math.max(7,day.value/maxDay*100)+'%':'3px'}}/>
            </div>
            <span className="v2-dashboard-bar-day">{day.label}</span>
          </div>)}
        </div>
        <div className="v2-dashboard-footnote">
          <span><FileText size={15}/> {number(total)} articles enregistrés au total</span>
          <span><Images size={15}/> {number(mediaResult.count)} médias</span>
        </div>
      </section>
      <section className="v2-dashboard-panel" aria-labelledby="v2-categories-title">
        <header><div><p className="v2-dashboard-eyebrow">RUBRIQUES</p>
          <h2 id="v2-categories-title">Les plus actives</h2>
          <p>Répartition des publications des 30 derniers jours.</p></div><Layers3 size={21}/></header>
        {topCategories.length?<div className="v2-dashboard-category-bars">
          {topCategories.map(([id,count])=><div key={id}>
            <div><span>{categoryNames.get(id)||'Autres actualités'}</span><strong>{count}</strong></div>
            <span className="v2-dashboard-category-track"><span style={{width:(count/maxCategory*100)+'%'}}/></span>
          </div>)}
        </div>:<p className="v2-dashboard-empty">Aucune publication dans les 30 derniers jours.</p>}
      </section>
    </div>

    <div className="v2-dashboard-detail-grid">
      <section className="v2-dashboard-panel" aria-labelledby="v2-latest-title">
        <header><div><p className="v2-dashboard-eyebrow">SUR LE SITE</p>
          <h2 id="v2-latest-title">Derniers articles publiés</h2>
          <p>Les informations actuellement accessibles aux lecteurs.</p></div>
          <Link href="/admin-v2/articles?status=published" className="v2-dashboard-see-all">Tout voir <ArrowUpRight size={15}/></Link></header>
        {live.length?<div className="v2-dashboard-story-feed">
          {live.map(article=><div className="v2-dashboard-story" key={article.id}>
            <span className="v2-dashboard-story-thumb">
              {article.cover_url?<img src={article.cover_url} loading="lazy" alt=""/>:<FileText size={21}/>}
            </span>
            <div><span className="v2-dashboard-story-label">{article.category_name} · {dateText(article.published_at)}</span>
              <Link href={'/admin-v2/articles/'+article.id+'/edit'}>{article.title}</Link>
              <small>Par {article.author_name}{article.publisher_name?' · Publié par '+article.publisher_name:''}</small></div>
            <a href={'/a/'+article.short_code} target="_blank" rel="noopener noreferrer"
              aria-label={'Voir '+article.title+' sur le site public'}><ArrowUpRight size={16}/></a>
          </div>)}
        </div>:<p className="v2-dashboard-empty">Aucun article publié.</p>}
      </section>
      <div className="v2-dashboard-side-panels">
        <section className="v2-dashboard-panel" aria-labelledby="v2-scheduled-title">
          <header><div><p className="v2-dashboard-eyebrow">CALENDRIER ÉDITORIAL</p>
            <h2 id="v2-scheduled-title">Publications programmées</h2>
            <p>Vos prochaines mises en ligne.</p></div><CalendarClock size={21}/></header>
          {scheduled.length?<div className="v2-dashboard-upcoming">
            {scheduled.map(a=><Link key={a.id} href={'/admin-v2/articles/'+a.id+'/edit'}>
              <CalendarClock size={17}/><span><strong>{a.title}</strong><small>{dateText(a.published_at)} · {a.author_name}</small></span>
            </Link>)}
          </div>:<div className="v2-dashboard-empty"><Clock3 size={24}/><span>Aucune publication programmée.</span></div>}
          <Link className="v2-dashboard-panel-link" href="/admin-v2/articles?status=scheduled">Ouvrir le calendrier éditorial <ChevronRight size={14}/></Link>
        </section>
        <section className="v2-dashboard-panel" aria-labelledby="v2-authors-title">
          <header><div><p className="v2-dashboard-eyebrow">ÉQUIPE</p>
            <h2 id="v2-authors-title">Publications par rédacteur</h2>
            <p>Articles publiés au cours des 30 derniers jours.</p></div><UsersRound size={21}/></header>
          {authors.length?<div className="v2-dashboard-author-list">
            {authors.map(([id,count],index)=><div key={id}>
              <span className="v2-dashboard-rank">{index+1}</span>
              <span className="v2-dashboard-author-avatar" aria-hidden="true">
                {(authorNames.get(id)||'TV').slice(0,2).toUpperCase()}</span>
              <strong>{authorNames.get(id)||'Rédaction TV+'}</strong>
              <span className="v2-dashboard-author-count">{count} article{count>1?'s':''}</span>
            </div>)}
          </div>:<p className="v2-dashboard-empty">Aucune publication enregistrée sur cette période.</p>}
          <p className="v2-dashboard-footnote-text">Comptage fondé sur l’auteur indiqué dans chaque article.</p>
        </section>
      </div>
    </div>

    <section className="v2-dashboard-panel v2-dashboard-recent" aria-labelledby="v2-recent-title">
      <header><div><p className="v2-dashboard-eyebrow">SUIVI DES CONTENUS</p>
        <h2 id="v2-recent-title">Dernières modifications</h2>
        <p>Articles récemment mis à jour, avec leurs responsables et statuts.</p></div>
        <Link href="/admin-v2/articles" className="v2-dashboard-see-all">Bibliothèque <ArrowUpRight size={15}/></Link></header>
      {recent.length?<div className="v2-dashboard-recent-table">
        <div className="v2-dashboard-recent-header"><span>Article</span><span>Auteur</span><span>Statut</span><span>Modification</span><span>Ouvrir</span></div>
        {recent.map(a=><div className="v2-dashboard-recent-row" key={a.id}>
          <div><strong>{a.title}</strong><small>{a.category_name}</small></div>
          <span>{a.author_name}</span>
          <span><span className={'v2-newsroom-status status-'+a.status}><span aria-hidden="true"/>{LABELS[a.status]||'À vérifier'}</span></span>
          <time>{dateText(a.updated_at)}</time>
          <Link href={'/admin-v2/articles/'+a.id+'/edit'} aria-label={'Modifier '+a.title}><ArrowUpRight size={17}/></Link>
        </div>)}
      </div>:<p className="v2-dashboard-empty">Aucune modification récente.</p>}
    </section>
    {actor.permissions.includes('audit.read')&&audit.length>0&&
      <section className="v2-dashboard-panel v2-dashboard-audit" aria-labelledby="v2-audit-title">
        <header><div><p className="v2-dashboard-eyebrow">TRAÇABILITÉ</p>
          <h2 id="v2-audit-title">Journal des actions</h2>
          <p>Dernières opérations enregistrées sur les articles.</p></div><BarChart3 size={21}/></header>
        <div>{audit.map(entry=><p key={entry.id}>
          <span>{entry.action==='insert'?'Création':entry.action==='update'?'Modification':'Autre opération'} d’un article</span>
          <time>{dateText(entry.created_at)}</time>
        </p>)}</div>
      </section>}
  </div>;
}
