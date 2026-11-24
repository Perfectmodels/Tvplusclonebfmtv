import Breadcrumb from '../../components/Breadcrumb';
import StoryCard from '../../components/StoryCard';
import ArticlePagination from '../../components/ArticlePagination';
import {listArticles} from '../../lib/db/repository';

export const revalidate = 60;
const PAGE_SIZE=24;

export default async function LatestArticlesPage({
 searchParams,
}:{
 searchParams:Promise<{page?:string}>;
}) {
 const {page:rawPage}=await searchParams;
 const requested=Number(rawPage);
 const page=Number.isFinite(requested)?Math.min(2000,Math.max(1,Math.floor(requested))):1;
 const {items,total}=await listArticles({page,pageSize:PAGE_SIZE});
 const totalPages=Math.max(1,Math.ceil(total/PAGE_SIZE));

 return (
  <main className="shell listing-page">
   <Breadcrumb items={[{label:'Accueil',href:'/'},{label:'Dernières actualités'}]}/>
   <h1 className="page-title">Dernières actualités</h1>
   <p className="page-intro">
    Les articles publiés par TV+ Afrique, du plus récent au plus ancien.
    {total>0&&` ${total.toLocaleString('fr-FR')} articles disponibles.`}
   </p>
   {items.length>0
    ? <section className="selection-grid" aria-label="Articles récemment publiés">
       {items.map(story=><StoryCard key={story.shortId||story.slug} story={story}/>)}
      </section>
    : <p className="empty-state">Aucun article sur cette page.</p>}
   <ArticlePagination path="/actualites" page={page} totalPages={totalPages}/>
  </main>
 );
}
