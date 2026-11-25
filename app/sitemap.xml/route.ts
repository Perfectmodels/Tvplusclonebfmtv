import { getSiteUrl } from '../../lib/articles/site-url';
import { seoArticles, sitemapPageSize } from '../../lib/seo/catalog';
import { xml, xmlResponse } from '../../lib/seo/xml';

export async function GET() {
  const [base, { total }] = await Promise.all([getSiteUrl(), seoArticles(1)]);
  const count = Math.min(49_998, Math.ceil(total / sitemapPageSize));
  const files = ['pages.xml', 'news.xml', ...Array.from({ length: count }, (_, index) => `articles-${index + 1}.xml`)];
  return xmlResponse('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    files.map((file) => `<sitemap><loc>${xml(base + '/sitemap-' + file)}</loc></sitemap>`).join('') + '</sitemapindex>');
}
