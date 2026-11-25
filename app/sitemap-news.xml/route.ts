import { getSiteUrl } from '../../lib/articles/site-url';
import { articlePath } from '../../lib/articles/urls';
import { escapeXml as x, recentEditorialArticles, validDate, xmlResponse, unavailableFeed } from '../../lib/seo/public-feeds';

export const revalidate = 300;
export async function GET() {
  try {
    const [base, articles] = await Promise.all([getSiteUrl(), recentEditorialArticles()]);
    const now = Date.now();
    const entries = articles.filter(item => {
      const date = validDate(item.publishedAt);
      return date && date.getTime() >= now - 48 * 60 * 60 * 1000 && date.getTime() <= now;
    }).slice(0, 1000).map(item =>
      '<url><loc>' + x(base + articlePath(item)) + '</loc><news:news><news:publication><news:name>TV+ Afrique</news:name><news:language>fr</news:language></news:publication><news:publication_date>' + validDate(item.publishedAt)!.toISOString() + '</news:publication_date><news:title>' + x(item.title) + '</news:title></news:news></url>'
    );
    return xmlResponse('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">' + entries.join('') + '</urlset>');
  } catch { return unavailableFeed(); }
}
