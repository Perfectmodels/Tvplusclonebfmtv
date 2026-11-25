import V2ArticleEditor from '../../../../components/admin/V2ArticleEditor';
import { requireV2Page } from '../../../../lib/auth/v2-admin';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }: { searchParams: Promise<{ veille?: string }> }) {
  const actor = await requireV2Page('articles.create');
  const fromWatch = (await searchParams).veille === '1';
  return <V2ArticleEditor actorId={actor.id} canReview={actor.permissions.includes('articles.review')} fromWatch={fromWatch} />;
}
