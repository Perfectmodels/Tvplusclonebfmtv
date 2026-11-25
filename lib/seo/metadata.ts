import type { Metadata } from 'next';
import type { PublicArticle } from '../db/repository';
import { articlePath } from '../articles/urls';
import { cleanText, isoDate } from './xml';

export const publisherName = 'TV+ Afrique';
export function articleAuthor(article: PublicArticle) {
  return article.author?.trim() || 'La rédaction TV+ Afrique';
}

export function articleMetadata(article: PublicArticle, base: string): Metadata {
  const url = new URL(articlePath(article), base).href;
  const title = cleanText(article.seoTitle) || article.title;
  const description = [article.seoDescription, article.chapter, article.summary].map(cleanText).find(Boolean)?.slice(0, 165);
  const author = articleAuthor(article);
  const date = isoDate(article.publishedAt);
  const modified = isoDate(article.updatedAt) ?? date;
  const image = article.shortId
    ? { url: new URL('/og/' + encodeURIComponent(article.shortId) + '?v=' + encodeURIComponent(modified ?? '1'), base).href, width: 1200, height: 630, alt: article.title }
    : article.image ? { url: new URL(article.image, base).href, alt: article.coverAlt || article.title } : undefined;
  return {
    title, description,
    category: article.category,
    authors: [{ name: author }],
    alternates: { canonical: url, types: { 'application/rss+xml': '/rss.xml' } },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
    openGraph: {
      type: 'article', title, description, url, siteName: publisherName, locale: 'fr_GA',
      publishedTime: date, modifiedTime: modified, section: article.category, authors: [author],
      images: image ? [image] : [],
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, images: image ? [image.url] : [] },
  };
}

export function articleJsonLd(article: PublicArticle, url: string, categoryPath: string) {
  const base = new URL(url).origin;
  const author = articleAuthor(article);
  const published = isoDate(article.publishedAt);
  return {
    '@context': 'https://schema.org',
    '@graph': [{
      '@type': 'NewsArticle',
      '@id': url + '#article',
      url,
      mainEntityOfPage: url,
      headline: article.title,
      description: cleanText(article.chapter || article.summary) || undefined,
      image: article.image ? [new URL(article.image, base).href] : undefined,
      datePublished: published,
      dateModified: isoDate(article.updatedAt) ?? published,
      author: { '@type': /^la rédaction|^rédaction/i.test(author) ? 'Organization' : 'Person', name: author },
      publisher: { '@type': 'NewsMediaOrganization', '@id': base + '/#publisher', name: publisherName, url: base, logo: new URL('/logo.png', base).href },
      inLanguage: 'fr-GA',
      articleSection: article.category,
    }, {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Accueil', item: base + '/' },
        { '@type': 'ListItem', position: 2, name: article.category, item: new URL(categoryPath, base).href },
        { '@type': 'ListItem', position: 3, name: article.title, item: url },
      ],
    }],
  };
}
