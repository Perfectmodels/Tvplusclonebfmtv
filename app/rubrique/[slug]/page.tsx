import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import Breadcrumb from '../../../components/Breadcrumb';
import SectionHeading from '../../../components/SectionHeading';
import StoryCard from '../../../components/StoryCard';
import { categories as staticCategories } from '../../../lib/data';
import { categorySlug } from '../../../lib/categories';
import { getCategories, listArticles } from '../../../lib/db/repository';

export const revalidate = 60;

export async function generateStaticParams() {
  const { data: categories } = await getCategories();
  return (categories.length ? categories : staticCategories).map((c) => ({ slug: categorySlug(c) }));
}

export default async function Category({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const normalizedSlug = categorySlug(decodeURIComponent(slug));
  const { data: categories } = await getCategories();
  const label = (categories.length ? categories : staticCategories).find((c) => categorySlug(c) === normalizedSlug);
  if (!label) notFound();

  const { items } = await listArticles({ category: normalizedSlug, pageSize: 30 });

  return (
    <main className="shell category-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: label }]} />
      <h1 className="page-title">{label}</h1>
      <p className="page-intro">
        Retrouvez toute l’actualité {label.toLowerCase()} au Gabon : analyses, réactions,
        décryptages et dernières informations de la rédaction TV Plus.
      </p>

      {items.length > 0 ? (
        <>
          <div className="category-hero">
            <StoryCard story={items[0]} variant="hero" />
            <div className="hero-rail">
              {items.slice(1, 5).map((story) => <StoryCard key={story.slug} story={story} variant="rail" />)}
            </div>
          </div>
          <SectionHeading title={'Toutes les actualités ' + label.toLowerCase()} moreHref="/news-24-7" moreLabel="Le fil info" />
          <div className="selection-grid">
            {items.slice(5).map((story) => <StoryCard key={story.slug} story={story} />)}
          </div>
        </>
      ) : (
        <p className="empty-state">Les articles de cette rubrique seront bientôt disponibles.</p>
      )}
    </main>
  );
}
