import type { Metadata } from 'next';
import type { PublicArticle } from '../db/repository';
import { articlePath } from '../articles/urls';
import { absoluteUrl, plainText, validDate } from './public-feeds';

export function articleMetadata(item: PublicArticle | null, base: string): Metadata {
  if (!item) return { title: 'Article introuvable — TV+ Afrique', robots: { index: false, follow: false } };
  const url = base + articlePath(item);
  const title = plainText(item.seoTitle || item.title);
  const description = plainText(item.seoDescription || item.chapter || item.summary || '').slice(0, 165);
  const author = item.author || 'La rédaction TV+ Afrique';
  const photo = item.image ? absoluteUrl(item.image, base) : undefined;
  const shareImage = item.shortId ? base + '/og/' + encodeURIComponent(item.shortId) + '?v=' + encodeURIComponent(item.updatedAt ?? item.publishedAt ?? '1') : photo;
  const published = validDate(item.publishedAt)?.toISOString();
  const modified = validDate(item.updatedAt ?? item.publishedAt)?.toISOString();
  const noindex = /(?:^|[\s,])(?:noindex|none)(?:$|[\s,])/i.test(item.robots ?? '');
  const nofollow = /(?:^|[\s,])(?:nofollow|none)(?:$|[\s,])/i.test(item.robots ?? '');
  return {
    title, description, category: item.category, authors: [{name: author}],
    alternates: { canonical: url },
    robots: {index: !noindex, follow: !nofollow, googleBot: { index: !noindex, follow: !nofollow, 'max-image-preview': 'large' }},
    openGraph: {type:'article', title, description, url, siteName:'TV+ Afrique', locale:'fr_GA',
      publishedTime: published, modifiedTime: modified, section:item.category, authors:[author],
      images: shareImage ? [{url:shareImage, alt:item.coverAlt || item.title, ...(item.shortId ? {width:1200,height:630} : {})}] : []},
    twitter: {card:'summary_large_image', title, description, images:shareImage ? [shareImage] : []},
  };
}
