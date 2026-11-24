import type { Metadata } from 'next';
import { permanentRedirect, notFound } from 'next/navigation';
import { getArticleBySlug, listArticles } from '../../../lib/db/repository';
import { getSiteUrl } from '../../../lib/articles/site-url';
import ArticleView from '../../../components/article/ArticleView';
import {getV2ArticleReadCount} from '../../../lib/db/v2-public';
import {relatedBySeo} from '../../../lib/articles/related';

export const revalidate = 60;
type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const { item } = await getArticleBySlug(slug);
  if (!item) return { title: 'Article introuvable — TV+ Afrique' };
  const base = await getSiteUrl();
  const url = item.shortId ? `${base}/a/${item.shortId}` : `${base}/article/${slug}`;
  const title = item.seoTitle || item.title;
  const description = item.seoDescription || item.chapter || item.summary;
  return {
    title, description,
    alternates: { canonical: url },
    openGraph: {
      type: 'article', title, description, url, siteName: 'TV+ Afrique',
      images: item.image ? [{ url: item.image, width: 1200, height: 630, alt: item.coverAlt || item.title }] : [],
    },
    twitter: { card: 'summary_large_image', title, description, images: item.image ? [item.image] : [] },
  };
}

/** Préserver les anciens liens : redirection permanente vers l'URL canonique courte. */
export default async function ArticlePage({ params }: Params) {
  const { slug } = await params;
  const [{ item }, { items }] = await Promise.all([
    getArticleBySlug(slug), listArticles({ pageSize: 140 }),
  ]);
  if (!item) notFound();
  if (item.shortId) permanentRedirect(`/a/${item.shortId}`);
  const siteUrl = await getSiteUrl();
  const related=relatedBySeo(item,items,4);
  const initialReadCount=item.articleId?await getV2ArticleReadCount(item.articleId):0;
  return (
    <ArticleView
      story={item}
      related={related}
      initialReadCount={initialReadCount}
      shortUrl={`${siteUrl}${item.shortId ? '/a/' + item.shortId : '/article/' + slug}`}
    />
  );
}
