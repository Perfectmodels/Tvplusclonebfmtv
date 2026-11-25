import {requireV2Page} from '../../../lib/auth/v2-admin';
import PremiumAdmin from '../../../components/admin/PremiumAdmin';
import '../whatsapp/whatsapp.css';
export const dynamic='force-dynamic';
export default async function Page(){await requireV2Page('settings.manage');return <PremiumAdmin/>;}
