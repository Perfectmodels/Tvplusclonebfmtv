import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArticleView from '../../../components/article/ArticleView';
import { getArticleByShortId, listArticles } from '../../../lib/db/repository';
import { getSiteUrl } from '../../../lib/articles/site-url';

export const revalidate = 60;

type Params = { params: Promise<{ shortId: string }> };

export async function generateStaticParams() {
  const { items } = await listArticles({ pageSize: 48 });
  return items.filter((item) => item.shortId).map((item) => ({ shortId: item.shortId! }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { shortId } = await params;
  const { item } = await getArticleByShortId(shortId);
  if (!item) return { title: 'Article introuvable — TV+ Afrique', robots: { index: false, follow: false } };

  const siteUrl = await getSiteUrl();
  const url = `${siteUrl}/a/${shortId}`;
  const title = item.seoTitle || item.title;
  const description = (item.seoDescription || item.chapter || item.summary || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 165);

  return {
    title,
    description,
    keywords: item.keywords ?? item.tags ?? [],
    category: item.category,
    authors: [{ name: 'La rédaction TV+ Afrique' }],
    alternates: { canonical: url },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
    openGraph: {
      type: 'article',
      title,
      description,
      url,
      siteName: 'TV+ Afrique',
      locale: 'fr_GA',
      publishedTime: item.publishedAt,
      modifiedTime: item.updatedAt ?? item.publishedAt,
      section: item.category,
      authors: ['La rédaction TV+ Afrique'],
      images: [{ url: `${url}/opengraph-image`, width: 1200, height: 630, alt: `${item.category} — ${item.title}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${url}/opengraph-image`],
    },
  };
}

export default async function ShortArticlePage({ params }: Params) {
  const { shortId } = await params;
  const [{ item }, { items }] = await Promise.all([
    getArticleByShortId(shortId),
    listArticles({ pageSize: 30 }),
  ]);
  if (!item) notFound();
  const siteUrl = await getSiteUrl();

  const related = items
    .filter((s) => s.category.toLowerCase() === item.category.toLowerCase() && s.slug !== item.slug)
    .slice(0, 4);
  const others = items.filter((s) => s.slug !== item.slug).slice(0, 4);

  return <ArticleView story={item} related={related.length ? related : others} shortUrl={`${siteUrl}/a/${shortId}`} />;
}
