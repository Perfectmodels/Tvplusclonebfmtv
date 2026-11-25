import type { Metadata } from 'next';
import { articleMetadata } from '../../../lib/seo/article-metadata';
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
  return articleMetadata(item, await getSiteUrl());
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
