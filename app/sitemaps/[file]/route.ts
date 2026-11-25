import { getCategories, getPrograms } from '../../../lib/db/repository';
import { getSiteUrl } from '../../../lib/articles/site-url';
import { articlePath } from '../../../lib/articles/urls';
import { categoryHref } from '../../../lib/categories';
import { navigationCategories } from '../../../lib/public-navigation';
import { recentSeoArticles, seoArticles } from '../../../lib/seo/catalog';
import { isoDate, xml, xmlResponse } from '../../../lib/seo/xml';

const namespace = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const loc = (url: string) => `<loc>${xml(url)}</loc>`;
const pages = ['/', '/actualites', '/rubriques', '/direct', '/videos', '/podcasts', '/programme-tv',
  '/replay-emissions', '/replays', '/newsletters', '/a-propos', '/contacts', '/plan-du-site', '/news-24-7'];

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const base = await getSiteUrl();
  if (file === 'pages.xml') {
    const [{ data: categories }, { data: programs }] = await Promise.all([getCategories(), getPrograms()]);
    const paths = new Set([...pages, ...navigationCategories(categories).map(categoryHref),
      ...programs.flatMap((program) => program.slug ? ['/emissions/' + encodeURIComponent(program.slug)] : [])]);
    return xmlResponse(`<urlset xmlns="${namespace}">${[...paths].map((path) => `<url>${loc(base + path)}</url>`).join('')}</urlset>`);
  }

  if (file === 'news.xml') {
    const now = Date.now();
    const articles = await recentSeoArticles();
    const entries = articles.flatMap((article) => {
      const date = isoDate(article.publishedAt);
      if (!date || Date.parse(date) < now - 2 * 86_400_000 || Date.parse(date) > now) return [];
      return `<url>${loc(base + articlePath(article))}<news:news><news:publication><news:name>TV+ Afrique</news:name><news:language>fr</news:language></news:publication><news:publication_date>${date}</news:publication_date><news:title>${xml(article.title)}</news:title></news:news></url>`;
    });
    return xmlResponse(`<urlset xmlns="${namespace}" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${entries.join('')}</urlset>`);
  }

  const page = Number(file.match(/^articles-([1-9]\d{0,4})\.xml$/)?.[1]);
  if (!page || page > 49_998) return new Response('Sitemap introuvable', { status: 404 });
  const { items } = await seoArticles(page);
  if (!items.length) return new Response('Sitemap introuvable', { status: 404 });
  const entries = items.map((article) => {
    const date = isoDate(article.updatedAt) ?? isoDate(article.publishedAt);
    const image = /^https?:\/\//i.test(article.image) ? `<image:image><image:loc>${xml(article.image)}</image:loc></image:image>` : '';
    return `<url>${loc(base + articlePath(article))}${date ? `<lastmod>${date}</lastmod>` : ''}${image}</url>`;
  });
  return xmlResponse(`<urlset xmlns="${namespace}" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">${entries.join('')}</urlset>`);
}
