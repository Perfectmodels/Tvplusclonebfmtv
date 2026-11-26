import Link from 'next/link';
import Breadcrumb from '../../components/Breadcrumb';
import MediaBrowser from '../../components/MediaBrowser';
import {getEpisodes,getPrograms} from '../../lib/db/repository';
export const revalidate=60;
export default async function ReplaysPage(){
 const [{data:episodes,error},{data:programs}]=await Promise.all([getEpisodes(500),getPrograms()]);
 const items=episodes.map(e=>({id:e.id,title:e.title,category:programs.find(p=>p.id===e.programId)?.name||'Replay',image:e.thumbnail||programs.find(p=>p.id===e.programId)?.image||'/logo.png',meta:new Date(e.publishedAt).toLocaleDateString('fr-FR',{timeZone:'Africa/Libreville'}),description:e.description,href:'/replays/'+encodeURIComponent(e.id)}));
 return <main className="shell listing-page"><Breadcrumb items={[{label:'Accueil',href:'/'},{label:'Replays'}]}/><h1 className="page-title">Replays</h1><p className="page-intro">Retrouvez les émissions déjà diffusées sur TV+ Afrique.</p>{items.length?<><p>{items.length} épisodes disponibles au catalogue</p><MediaBrowser items={items} variant="video" pageSize={12}/></>:<p className="empty-state">{error||'Aucun replay disponible pour le moment.'}</p>}<p><Link href="/replay-emissions" className="direct-cta">Toutes les émissions →</Link></p></main>;
}
