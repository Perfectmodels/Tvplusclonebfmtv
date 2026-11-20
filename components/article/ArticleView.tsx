import Link from 'next/link';
import Breadcrumb from '../Breadcrumb';
import ShareButtons from '../ShareButtons';
import StoryCard from '../StoryCard';
import type { PublicArticle } from '../../lib/db/repository';
import type { Story } from '../../lib/data';
import { categoryHref } from '../../lib/categories';

export default function ArticleView({
  story,
  related,
  shortUrl,
}: {
  story: PublicArticle;
  related: Story[];
  shortUrl: string;
}) {
  const categoryPath = categoryHref(story.category);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: story.title,
    description: story.chapter || story.summary,
    image: story.image ? [story.image] : [],
    datePublished: story.publishedAt ?? undefined,
    dateModified: story.updatedAt ?? story.publishedAt ?? undefined,
    author: { '@type': 'Person', name: story.author || 'La rédaction' },
    publisher: { '@type': 'Organization', name: 'TV Plus' },
    mainEntityOfPage: shortUrl,
    url: shortUrl,
    articleSection: story.category,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <main className="shell">
        <div className="page-head">
          <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: story.category, href: categoryPath }]} />
        </div>

        <div className="article-layout">
          <article className="article-main">
            <Link href={categoryPath} className="article-category">{story.category}</Link>
            <h1>{story.title}</h1>
            {story.chapter && <p className="article-standfirst">{story.chapter}</p>}
            {!story.chapter && <p className="article-standfirst">{story.summary}</p>}

            {story.image && <figure className="article-figure">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={story.image} alt={story.coverAlt || story.title} />
              {(story.coverCaption || story.coverCredit) && (
                <figcaption className="article-caption">
                  {story.coverCaption} {story.coverCredit && `· ${story.coverCredit}`}
                </figcaption>
              )}
            </figure>}

            <div className="article-tools">
              <span>{story.author || 'La rédaction'} · {story.time} · Lecture {story.readingTime ?? 3} min</span>
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
            {(related.length ? related : []).map((item) => (
              <StoryCard key={item.slug} story={item} variant="rail" />
            ))}
          </aside>
        </div>
      </main>
    </>
  );
}
