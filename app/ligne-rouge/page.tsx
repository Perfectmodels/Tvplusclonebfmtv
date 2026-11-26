import Breadcrumb from '../../components/Breadcrumb';
import {AvPageHeader,AvPagination} from '../../components/AvCatalog';
import {listRedLine} from '../../lib/media/red-line';
export const revalidate=120;
export const metadata={title:'Ligne Rouge — TV+ Afrique',alternates:{canonical:'/ligne-rouge'}};
export default async function LigneRouge({searchParams}:{searchParams:Promise<{page?:string}>}){
 const page=Math.max(1,Math.min(1000,Math.floor(Number((await searchParams).page)||1))),size=12;
 const result=await listRedLine(size,page).catch(()=>null);
 return <main className="shell listing-page av-public"><Breadcrumb items={[{label:'Accueil',href:'/'},{label:'Ligne Rouge'}]}/><AvPageHeader current="/ligne-rouge" title="Ligne Rouge" description="Les déclarations et les citations de l’actualité."/>{result===null?<p role="alert">Le catalogue est momentanément indisponible.</p>:result.items.length?<div className="av-quote-grid">{result.items.map(m=><article id={m.id} key={m.id} className="av-quote"><div className="media-body">{m.thumbnail_url&&<img src={m.thumbnail_url} alt="" loading="lazy"/>}<h2 className="media-title">{m.title}</h2>{m.description&&<p>{m.description}</p>}{m.published_at&&<time>{new Date(m.published_at).toLocaleDateString('fr-FR',{timeZone:'Africa/Libreville'})}</time>}</div></article>)}</div>:<p>Aucun numéro publié.</p>}<AvPagination path="/ligne-rouge" page={page} size={size} total={result?.total??0}/></main>;
}
