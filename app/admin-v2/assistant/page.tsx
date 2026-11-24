import { requireV2Page } from '../../../lib/auth/v2-admin';
import TvPlusAssistant from '../../../components/admin/TvPlusAssistant';

export default async function Page() {
  await requireV2Page();
  return <TvPlusAssistant />;
}
