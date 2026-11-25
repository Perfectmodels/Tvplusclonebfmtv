import {notFound} from 'next/navigation';
import {studioKind} from '../../../../../lib/media/studio-types';
import {studioAccess} from '../../../../../lib/media/studio-access';
import {getCategories} from '../../../../../lib/db/repository';
import StudioEditor from '../../../../../components/admin/StudioEditor';
import '../../studio.css';
export default async function Page({params}:{params:Promise<{kind:string}>}){const kind=studioKind((await params).kind);if(!kind)notFound();const {reviewer,actor}=await studioAccess(kind);const categories=await getCategories().catch(()=>({data:[] as string[]}));return <StudioEditor kind={kind} reviewer={reviewer} canUpload={actor.permissions.includes('media.upload')} categories={categories.data}/>;}
