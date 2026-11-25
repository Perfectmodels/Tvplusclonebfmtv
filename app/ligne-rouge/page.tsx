import Link from 'next/link';
import Breadcrumb from '../../components/Breadcrumb';
import ShowIntro from '../../components/video/ShowIntro';
import ReplayEmbed from '../../components/video/ReplayEmbed';
import {getPrograms,getEpisodes} from '../../lib/db/repository';
export const revalidate=120;
export const metadata={title:'Ligne Rouge — TV+ Afrique',alternates:{canonical:'/ligne-rouge'}};
export default async function LigneRouge(){
 const [programs,replays]=await Promise.all([getPrograms().catch(()=>({data:[]})),getEpisodes(100).catch(()=>({data:[]}))]);
 const show=programs.data.find(p=>p.slug==='ligne-rouge'||p.name.toLowerCase().trim()==='ligne rouge');
 const episodes=show?replays.data.filter(e=>e.programId===show.id):[];
 return <main className="shell listing-page"><Breadcrumb items={[{label:'Accueil',href:'/'},{label:'Ligne Rouge'}]}/><section className="tvplus-media-strip is-red"><h1 className="page-title">Ligne Rouge</h1>{show?.description&&<p>{show.description}</p>}{show?.slug&&<Link href={'/emissions/'+show.slug}>Fiche de l’émission →</Link>}</section>{show&&<ShowIntro title={show.name} url={show.introVideoUrl} poster={show.image}/>}{episodes.length?<div className="media-grid">{episodes.map(e=><article key={e.id} className="media-card"><ReplayEmbed title={e.title} url={e.videoUrl} thumbnail={e.thumbnail}/><Link href={'/replays/'+e.id}>{e.title}</Link></article>)}</div>:<p className="empty-state">Aucun numéro publié pour le moment.</p>}</main>;
}
