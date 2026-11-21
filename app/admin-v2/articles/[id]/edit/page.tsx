import V2ArticleEditor from '../../../../../components/admin/V2ArticleEditor';
import { requireV2Page } from '../../../../../lib/auth/v2-admin';
export const dynamic='force-dynamic';
export default async function Page({params}:{params:Promise<{id:string}>}) {
  const actor=await requireV2Page('articles.read_all');const {id}=await params;
  return <V2ArticleEditor id={id} actorId={actor.id} canReview={actor.permissions.includes('articles.review')}/>;
}
