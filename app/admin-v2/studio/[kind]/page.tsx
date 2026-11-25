import {notFound} from 'next/navigation';
import {studioKind} from '../../../../lib/media/studio-types';
import {studioAccess} from '../../../../lib/media/studio-access';
import StudioLibrary from '../../../../components/admin/StudioLibrary';
import '../studio.css';
export default async function Page({params}:{params:Promise<{kind:string}>}){const kind=studioKind((await params).kind);if(!kind)notFound();await studioAccess(kind);return <StudioLibrary kind={kind}/>;}
