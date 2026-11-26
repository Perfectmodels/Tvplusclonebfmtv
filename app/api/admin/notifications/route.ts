import { requireApiPermission } from '../../../../lib/auth/api';
import { PERMISSIONS } from '../../../../lib/auth/permissions';
import { getServerSupabase } from '../../../../lib/supabase/server';
import { handleRoute, ok } from '../../../../lib/api/response';

export const dynamic = 'force-dynamic';

export const GET = handleRoute(async () => {
  await requireApiPermission(PERMISSIONS.ARTICLES_READ);
  const db = getServerSupabase();
  const [review, scheduled, contacts, drafts] = await Promise.all([
    db.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'review').is('deleted_at', null),
    db.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'scheduled').is('deleted_at', null),
    db.from('contacts').select('*', { count: 'exact', head: true }),
    db.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'draft').is('deleted_at', null),
  ]);
  return ok({
    items: [
      { label: 'Articles à valider', count: review.count ?? 0, href: '/admin/articles?status=review' },
      { label: 'Publications programmées', count: scheduled.count ?? 0, href: '/admin/articles?status=scheduled' },
      { label: 'Brouillons en cours', count: drafts.count ?? 0, href: '/admin/articles?status=draft' },
      { label: 'Messages reçus', count: contacts.count ?? 0, href: '/admin' },
    ],
    total: (review.count ?? 0) + (scheduled.count ?? 0) + (drafts.count ?? 0) + (contacts.count ?? 0),
  });
});
