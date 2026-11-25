import Link from 'next/link';
import { requireV2Page } from '../../../lib/auth/v2-admin';
import { listArticles } from '../../../lib/db/repository';
import { articlePath } from '../../../lib/articles/urls';
import { getSiteUrl } from '../../../lib/articles/site-url';

export const dynamic = 'force-dynamic';
export default async function SeoDashboard() {
  await requireV2Page('articles.read_all');
  const base = await getSiteUrl();
  const result = await listArticles({pageSize: 100}).catch(() => null);
  const articles = result?.source === 'static' ? [] : result?.items ?? [];
  const checks = articles.map(article => ({
    article,
    missing: [
      !article.seoTitle?.trim() && 'Titre SEO',
      !article.seoDescription?.trim() && 'Description SEO',
      !article.image && 'Couverture',
      !article.publishedAt && 'Date de publication',
      !article.tags?.length && 'Mots-clés éditoriaux',
    ].filter(Boolean),
  }));
  const metrics = [
    ['Articles publiés', result && result.source !== 'static' ? result.total : null],
    ['Articles examinés', result && result.source !== 'static' ? articles.length : null],
    ['Métadescription absente', result && result.source !== 'static' ? articles.filter(a => !a.seoDescription?.trim()).length : null],
    ['Couverture absente', result && result.source !== 'static' ? articles.filter(a => !a.image).length : null],
  ] as const;
  return <div className="v2-newsroom-dashboard">
    <header className="v2-newsroom-page-header"><div><p className="v2-newsroom-eyebrow">TV+ AFRIQUE · VISIBILITÉ NUMÉRIQUE</p><h1>SEO &amp; Visibilité numérique</h1><p>Contrôle éditorial des 100 dernières publications. Les données d’indexation et de trafic exigent une connexion externe.</p></div><Link className="v2-newsroom-secondary" href="/admin-v2/articles">Gérer les articles</Link></header>
    <section className="v2-dashboard-kpis" aria-label="Indicateurs SEO">{metrics.map(([label,value]) => <div key={label} className="v2-dashboard-kpi"><span>{label}</span><strong>{value === null ? '—' : value.toLocaleString('fr-FR')}</strong></div>)}</section>
    {(!result || result.source === 'static') && <p role="alert">Les données éditoriales sont indisponibles. Aucun résultat n’a été estimé.</p>}
    <section className="v2-dashboard-panel"><header><div><h2>Infrastructure publique</h2><p>Ouvrir et vérifier les documents générés par le site.</p></div></header>
      <ul>{[['Sitemap général','/sitemap.xml'],['Google Actualités','/sitemap-news.xml'],['Flux RSS éditorial','/rss.xml'],['Directives robots','/robots.txt']].map(([name,path])=><li key={path}><a href={path} target="_blank" rel="noreferrer">{name}</a></li>)}</ul>
      <p>Adresse canonique configurée : {base}</p>
    </section>
    <section className="v2-dashboard-panel"><header><div><h2>Optimisation des articles</h2><p>Contrôles internes, non assimilables à un score Google.</p></div></header>
      {checks.length ? <ul style={{listStyle:'none',padding:0,display:'grid',gap:12}}>{checks.map(({article,missing})=><li key={articlePath(article)} style={{borderBottom:'1px solid #dce1e7',paddingBottom:12,overflowWrap:'anywhere'}}><a href={articlePath(article)} target="_blank" rel="noreferrer"><strong>{article.title}</strong></a><p>{missing.length ? 'À compléter : '+missing.join(', ') : 'Tous les champs examinés sont renseignés'}</p></li>)}</ul> : <p>Aucun article à examiner.</p>}
    </section>
    <section className="v2-dashboard-panel"><header><div><h2>Mesure externe</h2><p>Google Search Console, Google Actualités, Discover, Bing, analytics et GEO : données non connectées à ce module.</p></div></header>
      <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer">Ouvrir Google Search Console</a>
    </section>
  </div>;
}
