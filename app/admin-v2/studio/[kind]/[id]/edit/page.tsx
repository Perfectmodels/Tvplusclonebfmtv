import {notFound} from 'next/navigation';
import Link from 'next/link';
import {studioKind,formats,type StudioItem} from '../../../../../../lib/media/studio-types';
import {studioAccess} from '../../../../../../lib/media/studio-access';
import {newsroom} from '../../../../../../lib/admin-v2/lws';
import {getCategories} from '../../../../../../lib/db/repository';
import {ApiError} from '../../../../../../lib/api/response';
import StudioEditor from '../../../../../../components/admin/StudioEditor';
import '../../../studio.css';
export default async function Page({params}:{params:Promise<{kind:string;id:string}>}){const p=await params,kind=studioKind(p.kind);if(!kind||! /^[0-9a-f-]{36}$/i.test(p.id))notFound();const {actor,reviewer}=await studioAccess(kind);
 let item:StudioItem;try{item=await newsroom<StudioItem>(actor,'studio.get',{data:{kind,id:p.id}});}catch(e){if(e instanceof ApiError&&e.status===404)notFound();return <div className="studio-shell"><h1>Contenu indisponible</h1><p role="alert">La connexion au Studio n'a pas abouti. Vérifiez l'API et la migration SQL.</p><Link href={'/admin-v2/studio/'+formats[kind].slug}>Retour au catalogue</Link></div>;}
 const categories=await getCategories().catch(()=>({data:[] as string[]}));return <StudioEditor kind={kind} initial={item} reviewer={reviewer} canUpload={actor.permissions.includes('media.upload')} categories={categories.data}/>;}
