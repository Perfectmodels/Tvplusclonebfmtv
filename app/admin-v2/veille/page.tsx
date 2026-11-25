import { requireV2Page } from '../../../lib/auth/v2-admin';
import EditorialWatch from '../../../components/admin/EditorialWatch';

export default async function Page() {
  const actor = await requireV2Page();
  return <EditorialWatch actorId={actor.id} />;
}
