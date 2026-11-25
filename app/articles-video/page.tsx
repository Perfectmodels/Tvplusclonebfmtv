import Breadcrumb from '../../components/Breadcrumb';
import StoryCard from '../../components/StoryCard';
import ArticlePagination from '../../components/ArticlePagination';
import {listArticles} from '../../lib/db/repository';
export const revalidate=60;
export const metadata={title:'Articles vidéo — TV+ Afrique'};
export default async function ArticlesVideo({searchParams}:{searchParams:Promise<{page?:string}>}){
 const page=Math.max(1,Math.min(2000,Math.floor(Number((await searchParams).page)||1)));
 const {items,total}=await listArticles({videoOnly:true,page,pageSize:10});
 return <main className="shell listing-page"><Breadcrumb items={[{label:'Accueil',href:'/'},{label:'Articles vidéo'}]}/><h1 className="page-title">L’actualité en vidéo</h1><p className="page-intro">Les reportages accompagnés d’un article de la rédaction.</p>{items.length?<div className="selection-grid">{items.map(s=><StoryCard key={s.slug} story={s}/>)}</div>:<p className="empty-state">Aucun article vidéo disponible.</p>}<ArticlePagination path="/articles-video" page={page} totalPages={Math.ceil(total/10)}/></main>;
}
