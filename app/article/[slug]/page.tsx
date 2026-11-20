import { permanentRedirect, notFound } from 'next/navigation';
import { getArticleBySlug } from '../../../lib/db/repository';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

/** L'ancienne URL longue redirige en permanence vers l'URL courte définitive. */
export default async function LegacyArticlePage({ params }: Params) {
  const { slug } = await params;
  const { item } = await getArticleBySlug(slug);
  if (!item) notFound();
  if (!item.shortId) notFound();
  permanentRedirect(`/a/${item.shortId}`);
}
