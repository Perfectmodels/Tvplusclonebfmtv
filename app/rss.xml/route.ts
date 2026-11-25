import { getSiteUrl } from '../../lib/articles/site-url';
import { articlePath } from '../../lib/articles/urls';
import { escapeXml as x, plainText, recentEditorialArticles, validDate, xmlResponse, unavailableFeed } from '../../lib/seo/public-feeds';

export const revalidate = 300;
export async function GET() {
  try {
    const [base, articles] = await Promise.all([getSiteUrl(), recentEditorialArticles()]);
    const items = articles.slice(0, 50).map(item => {
      const url = x(base + articlePath(item));
      return '<item><title>' + x(item.title) + '</title><link>' + url + '</link><guid isPermaLink="true">' + url + '</guid><description>' + x(plainText(item.summary || '')) + '</description><category>' + x(item.category) + '</category><pubDate>' + validDate(item.publishedAt)!.toUTCString() + '</pubDate></item>';
    });
    return xmlResponse('<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>TV+ Afrique</title><link>' + x(base) + '</link><description>Les dernières actualités de TV+ Afrique</description><language>fr-GA</language><atom:link href="' + x(base + '/rss.xml') + '" rel="self" type="application/rss+xml"/>' + items.join('') + '</channel></rss>', 'application/rss+xml');
  } catch { return unavailableFeed(); }
}
