import { articleMetadata } from '../../../lib/seo/metadata';
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
  const { items } = await listArticles({ pageSize: 48 });
  return items.filter((item) => item.shortId).map((item) => ({ shortId: item.shortId! }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { shortId } = await params;
  const { item } = await getArticleByShortId(shortId);
  if (!item) return { title: 'Article introuvable — TV+ Afrique', robots: { index: false, follow: false } };
  return articleMetadata(item, await getSiteUrl());
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
