import Breadcrumb from '../../components/Breadcrumb';
import CatalogBrowser from '../../components/CatalogBrowser';
import {listCatalog} from '../../lib/media/catalog';
import Link from 'next/link';
export const revalidate=120;
export const metadata={title:'Reportages et vidéos — TV+ Afrique',alternates:{canonical:'/videos'}};
export default async function VideosPage(){const data=await listCatalog('reportage');return <main className="shell listing-page"><Breadcrumb items={[{label:'Accueil',href:'/'},{label:'Vidéos'}]}/><h1 className="page-title">Reportages & vidéos</h1><p className="page-intro">Reportages, interviews et décryptages de la rédaction TV+ Afrique.</p><div className="rubrique-chips"><Link href="/reels">TV+ Reels</Link><Link href="/articles-video">Articles vidéo</Link><Link href="/ligne-rouge">Ligne Rouge</Link><Link href="/replays">Replays</Link></div><CatalogBrowser {...data}/></main>;}
