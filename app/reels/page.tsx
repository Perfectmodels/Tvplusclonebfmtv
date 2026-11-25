import Breadcrumb from '../../components/Breadcrumb';
import CatalogBrowser from '../../components/CatalogBrowser';
import {listCatalog} from '../../lib/media/catalog';
export const revalidate=120;
export const metadata={title:'TV+ Reels — Les vidéos courtes de TV+ Afrique',alternates:{canonical:'/reels'}};
export default async function Reels(){const data=await listCatalog('reel');return <main className="shell listing-page"><Breadcrumb items={[{label:'Accueil',href:'/'},{label:'Reels'}]}/><h1 className="page-title">TV+ Reels</h1><p className="page-intro">L’actualité en vidéos courtes, au format vertical.</p><CatalogBrowser {...data} vertical/></main>;}
