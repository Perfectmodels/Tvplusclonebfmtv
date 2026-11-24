import {notFound} from 'next/navigation';
import Breadcrumb from '../../../components/Breadcrumb';
import StoryCard from '../../../components/StoryCard';
import ArticlePagination from '../../../components/ArticlePagination';
import {categories as staticCategories} from '../../../lib/data';
import {categorySlug} from '../../../lib/categories';
import {getCategories,listArticles} from '../../../lib/db/repository';
export const revalidate=60;
const PAGE_SIZE=12;
export async function generateStaticParams(){
 const {data:categories}=await getCategories();
 return (categories.length?categories:staticCategories).map(c=>({slug:categorySlug(c)}));
}
export default async function Category({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{page?:string}>}){
 const {slug}=await params;
 const normalizedSlug=categorySlug(decodeURIComponent(slug));
 const {data:categories}=await getCategories();
 const label=(categories.length?categories:staticCategories).find(c=>categorySlug(c)===normalizedSlug);
 if(!label)notFound();
 const search=await searchParams;
 const page=Math.min(2000,Math.max(1,Number(search.page)||1));
 const {items,total}=await listArticles({category:normalizedSlug,page,pageSize:PAGE_SIZE});
 const totalPages=Math.max(1,Math.ceil(total/PAGE_SIZE));
 return <main className="shell category-page">
  <Breadcrumb items={[{label:'Accueil',href:'/'},{label}]}/>
  <h1 className="page-title">{label}</h1>
  <p className="page-intro">Toute l'actualité de la rubrique {label.toLowerCase()}, classée du plus récent au plus ancien. {total.toLocaleString('fr-FR')} publications.</p>
  {items.length?<>
    {page===1&&<div className="category-hero">
      <StoryCard story={items[0]} variant="hero"/>
      <div className="hero-rail">{items.slice(1,5).map(s=><StoryCard key={s.shortId||s.slug} story={s} variant="rail"/>)}</div>
    </div>}
    <div className="selection-grid">{(page===1?items.slice(5):items).map(s=><StoryCard key={s.shortId||s.slug} story={s}/>)}</div>
  </>:<p className="empty-state">Aucun article sur cette page.</p>}
  <ArticlePagination path={'/rubrique/'+normalizedSlug} page={page} totalPages={totalPages}/>
 </main>;
}
