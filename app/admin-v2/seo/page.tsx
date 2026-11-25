import Link from 'next/link';
import { requireV2Page } from '../../../lib/auth/v2-admin';
import { seoArticles } from '../../../lib/seo/catalog';
import { articlePath } from '../../../lib/articles/urls';
import { isoDate } from '../../../lib/seo/xml';

export default async function SeoPage() {
  await requireV2Page('articles.review');
  const catalog = await seoArticles(1).catch(() => null);
  const audited = catalog?.items.slice(0, 20) ?? [];
  const withoutImage = audited.filter((article) => !article.image).length;
  const withoutDate = audited.filter((article) => !isoDate(article.publishedAt)).length;
  const fallbackDescriptions = audited.filter((article) => !article.seoDescription?.trim()).length;

  return <main className="v2-newsroom-page">
    <header className="v2-newsroom-page-header"><h1>SEO et visibilité numérique</h1></header>
    <section className="v2-dashboard-panel">
      <h2>Catalogue public</h2>
      {catalog ? <>
        <p>{catalog.total.toLocaleString('fr-FR')} articles publiés selon le catalogue.</p>
        {audited.length > 0 && <><p>Contrôle sur les {audited.length} articles les plus récents.</p>
          <ul>
            <li>{withoutImage} sans couverture</li>
            <li>{withoutDate} sans date de publication valide</li>
            <li>{fallbackDescriptions} sans métadescription saisie</li>
          </ul>
        </>}
      </> : <p role="status">Le catalogue est momentanément indisponible.</p>}
      <Link href="/admin-v2/articles">Ouvrir la bibliothèque des articles</Link>
    </section>
    <section className="v2-dashboard-panel">
      <h2>Indexation et flux</h2>
      <ul>
        <li><a href="/sitemap.xml">Index des sitemaps</a></li>
        <li><a href="/sitemap-news.xml">Sitemap Google Actualités</a></li>
        <li><a href="/robots.txt">Directives robots.txt</a></li>
        <li><a href="/rss.xml">Flux RSS des publications</a></li>
      </ul>
      <p>Les impressions, clics et données d’indexation seront disponibles après connexion de Search Console.</p>
    </section>
    {audited.length > 0 && <section className="v2-dashboard-panel">
      <h2>Vérifier les pages publiques</h2>
      <ul>{audited.slice(0, 5).map((article) => <li key={article.slug}>
        <Link href={articlePath(article)}>{article.title}</Link>
      </li>)}</ul>
    </section>}
  </main>;
}
