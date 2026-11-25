import Breadcrumb from '../../components/Breadcrumb';
import CatalogBrowser from '../../components/CatalogBrowser';
import {listCatalog} from '../../lib/media/catalog';
export const revalidate=120;
export const metadata={title:'Podcasts — TV+ Afrique',alternates:{canonical:'/podcasts'}};
export default async function PodcastsPage(){const data=await listCatalog('podcast');return <main className="shell listing-page"><Breadcrumb items={[{label:'Accueil',href:'/'},{label:'Podcasts'}]}/><h1 className="page-title">TV+ Podcasts</h1><p className="page-intro">Entretiens, récits et analyses à écouter quand vous le souhaitez.</p><CatalogBrowser {...data}/></main>;}
