import type { Metadata } from 'next';
import { getSiteUrl } from '../../lib/articles/site-url';
import Breadcrumb from '../../components/Breadcrumb';
import StoryCard from '../../components/StoryCard';
import ArticlePagination from '../../components/ArticlePagination';
import {listArticles} from '../../lib/db/repository';

export const revalidate = 60;
const PAGE_SIZE=24;

function normalizePage(raw?: string) {
 const requested=Number(raw);
 return Number.isFinite(requested)?Math.min(2000,Math.max(1,Math.floor(requested))):1;
}
export async function generateMetadata({searchParams}:{searchParams:Promise<{page?:string}>}):Promise<Metadata>{
 const page=normalizePage((await searchParams).page);
 const base=await getSiteUrl();
 const title='Dernières actualités — TV+ Afrique'+(page>1?' — Page '+page:'');
 return {title,description:'Les dernières actualités publiées par la rédaction TV+ Afrique.',alternates:{canonical:base+'/actualites'+(page>1?'?page='+page:'')}};
}

export default async function LatestArticlesPage({
 searchParams,
}:{
 searchParams:Promise<{page?:string}>;
}) {
 const {page:rawPage}=await searchParams;
 const page=normalizePage(rawPage);
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
