import { getSiteUrl } from '../../lib/articles/site-url';
import { articlePath } from '../../lib/articles/urls';
import { recentSeoArticles } from '../../lib/seo/catalog';
import { cleanText, isoDate, xml, xmlResponse } from '../../lib/seo/xml';

export async function GET() {
  const [base, articles] = await Promise.all([getSiteUrl(), recentSeoArticles()]);
  const entries = articles.slice(0, 40).map((article) => {
    const url = xml(base + articlePath(article));
    const date = isoDate(article.publishedAt);
    return `<item><title>${xml(article.title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><description>${xml(cleanText(article.summary))}</description><category>${xml(article.category)}</category>${date ? `<pubDate>${new Date(date).toUTCString()}</pubDate>` : ''}</item>`;
  });
  return xmlResponse(`<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>TV+ Afrique</title><link>${xml(base)}</link><description>L’actualité du Gabon et de l’Afrique</description><language>fr-GA</language><atom:link href="${xml(base + '/rss.xml')}" rel="self" type="application/rss+xml"/>${entries.join('')}</channel></rss>`, 'application/rss+xml');
}
