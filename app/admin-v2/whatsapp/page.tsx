import {requireV2Page} from '../../../lib/auth/v2-admin';
import WhatsAppCenter from '../../../components/admin/WhatsAppCenter';
import './whatsapp.css';
export const dynamic='force-dynamic';
export default async function Page(){await requireV2Page('settings.manage');return <WhatsAppCenter/>;}
