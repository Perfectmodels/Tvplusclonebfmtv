import Breadcrumb from '../../components/Breadcrumb';
import ReelsViewer from '../../components/ReelsViewer';
import {AvPagination} from '../../components/AvCatalog';
import {listCatalog} from '../../lib/media/catalog';
export const revalidate=120;
export const metadata={title:'TV+ Reels — Les vidéos courtes de TV+ Afrique',alternates:{canonical:'/reels'}};
export default async function Reels({searchParams}:{searchParams:Promise<{page?:string}>}){const page=Math.max(1,Math.min(10000,Math.floor(Number((await searchParams).page)||1))),size=20;const data=await listCatalog('reel',size,page);return <main className="shell listing-page av-public"><Breadcrumb items={[{label:'Accueil',href:'/'},{label:'Reels'}]}/><header className="av-public-head"><h1 className="page-title">TV+ Reels</h1><p className="page-intro">L'actualité en vidéos courtes : productions TV+ et sélections de Reels cités dans nos articles.</p></header>{!data.available?<p role="alert">Les Reels sont momentanément indisponibles.</p>:!data.items.length?<p className="empty-state">Aucun Reel publié sur cette page.</p>:<ReelsViewer key={page} items={data.items}/>}<AvPagination path="/reels" page={page} total={data.total} size={size}/></main>;}
