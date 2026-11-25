import { articleAuthor, articleJsonLd } from '../../lib/seo/metadata';
import { UserRound } from 'lucide-react';
import Breadcrumb from '../Breadcrumb';
import ShareButtons from '../ShareButtons';
import StoryCard from '../StoryCard';
import ArticleReadCounter from './ArticleReadCounter';
import type { PublicArticle } from '../../lib/db/repository';
import type { Story } from '../../lib/data';
import { categoryHref } from '../../lib/categories';

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
  const author = articleAuthor(story);
  const jsonLd = articleJsonLd(story, shortUrl, categoryPath);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <main className="shell">
        <div className="page-head">
          <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: story.category, href: categoryPath }]} />
        </div>

        <div className="article-layout">
          <article className="article-main">
            <header className="article-heading">
              <h1>{story.title}</h1>
              <div className="article-meta">
                {story.time && <time dateTime={story.publishedAt}>{story.time}</time>}
                {story.readingTime && <span>{story.readingTime} min de lecture</span>}
                <ArticleReadCounter key={story.slug} shortCode={story.shortId} initial={story.reads ?? initialReadCount} />
              </div>
            </header>

            {story.image && (
              <figure className="article-cover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={story.image} alt={story.coverAlt || ''} decoding="async" fetchPriority="high" />
                {(story.coverCaption || story.coverCredit) && (
                  <figcaption>{[story.coverCaption, story.coverCredit].filter(Boolean).join(' · ')}</figcaption>
                )}
              </figure>
            )}

            <div className="article-body">
              {story.contentHtml ? (
                <div dangerouslySetInnerHTML={{ __html: story.contentHtml }} />
              ) : (
                story.body?.split(/\r?\n+/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)
              )}
            </div>
            <footer className="article-signature">
              <div className="article-byline">
                <span className="article-byline-icon"><UserRound size={20} aria-hidden="true" /></span>
                <div>
                  <span className="article-byline-label">Écrit par</span>
                  <strong>{author}</strong>
                </div>
              </div>
              <ShareButtons key={shortUrl} url={shortUrl} title={story.title} />
            </footer>
          </article>

          {related.length > 0 && (
            <aside className="article-rail" aria-labelledby="related-articles-title">
              <h2 id="related-articles-title" className="article-rail-title">À lire aussi</h2>
              {related.map((item) => <StoryCard key={item.slug} story={item} variant="rail" />)}
            </aside>
          )}
        </div>
      </main>
    </>
  );
}
