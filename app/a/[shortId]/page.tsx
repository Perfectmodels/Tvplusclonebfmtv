import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArticleView from '../../../components/article/ArticleView';
import {getV2ArticleReadCount} from '../../../lib/db/v2-public';
import {relatedBySeo} from '../../../lib/articles/related';
import { getArticleByShortId, listArticles } from '../../../lib/db/repository';
import { getSiteUrl } from '../../../lib/articles/site-url';

export const revalidate = 60;

type Params = { params: Promise<{ shortId: string }> };

export async function generateStaticParams() {
  // Le catalogue MySQL peut être indisponible pendant le build (variable d'environnement
  // absente ou API LWS non joignable). Avec `revalidate`, Next génère les pages à la demande.
  try {
    const { items } = await listArticles({ pageSize: 48 });
    return items.filter((item) => item.shortId).map((item) => ({ shortId: item.shortId! }));
  } catch {
    return [];
  }
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
      images: [{ url: `${siteUrl}/og/${shortId}?v=${encodeURIComponent(item.updatedAt ?? item.publishedAt ?? '1')}`, width: 1200, height: 630, alt: `${item.category} — ${item.title}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${siteUrl}/og/${shortId}?v=${encodeURIComponent(item.updatedAt ?? item.publishedAt ?? '1')}`],
    },
  };
}

export default async function ShortArticlePage({ params }: Params) {
  const { shortId } = await params;
  const [{ item }, { items }] = await Promise.all([
    getArticleByShortId(shortId),
    listArticles({ pageSize: 140 }),
  ]);
  if (!item) notFound();
  const siteUrl = await getSiteUrl();

  const related=relatedBySeo(item,items,4);
  const initialReadCount=item.reads ?? (item.articleId ? await getV2ArticleReadCount(item.articleId) : 0);
  return <ArticleView story={item} related={related} initialReadCount={initialReadCount} shortUrl={`${siteUrl}/a/${shortId}`} />;
}
