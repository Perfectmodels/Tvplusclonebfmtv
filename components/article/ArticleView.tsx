import Link from 'next/link';
import Breadcrumb from '../Breadcrumb';
import ShareButtons from '../ShareButtons';
import StoryCard from '../StoryCard';
import ArticleReadCounter from './ArticleReadCounter';
import type { PublicArticle } from '../../lib/db/repository';
import type { Story } from '../../lib/data';
import { categoryHref } from '../../lib/categories';
import { absoluteUrl, plainText, validDate } from '../../lib/seo/public-feeds';

export default function ArticleView({
  story,
  related,
  shortUrl,
  initialReadCount=0,
}: {
  story: PublicArticle;
  related: Story[];
  shortUrl: string;
  initialReadCount?:number;
}) {
  const categoryPath = categoryHref(story.category);

  const photo = story.image ? absoluteUrl(story.image, shortUrl) : undefined;
  const authorName = story.author || 'La rédaction';
  const published = validDate(story.publishedAt);
  const updated = validDate(story.updatedAt ?? story.publishedAt);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: story.title,
    description: plainText(story.chapter || story.summary || ''),
    image: photo ? [photo] : undefined,
    datePublished: published?.toISOString(),
    dateModified: updated?.toISOString(),
    author: { '@type': /rédaction|tv\+/i.test(authorName) ? 'Organization' : 'Person', name: authorName },
    publisher: {
      '@type': 'NewsMediaOrganization', name: 'TV+ Afrique',
      logo: { '@type': 'ImageObject', url: new URL('/logo.png', shortUrl).toString() },
    },
    inLanguage: 'fr-GA',
    isAccessibleForFree: true,
    keywords: (story.tags ?? []).join(', '),
    mainEntityOfPage: shortUrl,
    url: shortUrl,
    articleSection: story.category,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <main className="shell">
        <div className="page-head">
          <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: story.category, href: categoryPath }]} />
        </div>

        <div className="article-layout">
          <article className="article-main">
            <header className={'article-feature' + (story.image ? ' has-image' : '')}>
              {story.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={story.image} alt={story.coverAlt || ''} className="article-feature-image" decoding="async" fetchPriority="high"/>
              )}
              <span className="article-feature-gradient" aria-hidden="true" />
              <div className="article-feature-content">
                <Link href={categoryPath} className="article-feature-category">{story.category}</Link>
                <h1>{story.title}</h1>
                <ArticleReadCounter shortCode={story.shortId} initial={initialReadCount}/>
                <p className="article-feature-intro">{story.chapter || story.summary}</p>
              </div>
            </header>
            {(story.coverCaption || story.coverCredit) && story.image && (
              <p className="article-photo-credit">
                {story.coverCaption} {story.coverCredit && `· ${story.coverCredit}`}
              </p>
            )}

            <div className="article-tools">
              <span>{authorName} · {published ? <time dateTime={published.toISOString()}>{new Intl.DateTimeFormat('fr-GA', {dateStyle:'long',timeStyle:'short',timeZone:'Africa/Libreville'}).format(published)}</time> : story.time} · Lecture {story.readingTime ?? 3} min</span>
              <ShareButtons url={shortUrl} title={story.title} />
            </div>

            <div className="article-body">
              {story.contentHtml ? (
                <div dangerouslySetInnerHTML={{ __html: story.contentHtml }} />
              ) : (
                <p>{story.summary}</p>
              )}
            </div>
          </article>

          <aside className="article-rail" aria-label="À lire aussi">
            <h2 className="article-rail-title">À lire aussi</h2>
            <p className="article-rail-hint">Articles sélectionnés selon le sujet, les mots-clés et les informations SEO.</p>
            {(related.length ? related : []).map((item) => (
              <StoryCard key={item.slug} story={item} variant="rail" />
            ))}
          </aside>
        </div>
      </main>
    </>
  );
}
