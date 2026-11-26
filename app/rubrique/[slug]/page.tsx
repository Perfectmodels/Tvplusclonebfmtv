import type {Metadata} from 'next';
import {getSiteUrl} from '../../../lib/articles/site-url';
import {notFound} from 'next/navigation';
import Breadcrumb from '../../../components/Breadcrumb';
import ArticleScroll from '../../../components/ArticleScroll';
import StoryCard from '../../../components/StoryCard';
import ArticlePagination from '../../../components/ArticlePagination';
import {categories as staticCategories} from '../../../lib/data';
import {categorySlug} from '../../../lib/categories';
import {getCategories,listArticles} from '../../../lib/db/repository';
export const revalidate=60;
const PAGE_SIZE=12;
export async function generateMetadata({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{page?:string}>}):Promise<Metadata>{
 const slug=categorySlug((await params).slug);
 const {data:categories}=await getCategories();const label=categories.find(c=>categorySlug(c)===slug);
 if(!label)return {title:'Rubrique introuvable',robots:{index:false,follow:false}};
 const page=Math.min(2000,Math.max(1,Math.floor(Number((await searchParams).page)||1)));
 const {items}=await listArticles({category:slug,page,pageSize:PAGE_SIZE});
 return {title:label+' — Actualités TV+ Afrique'+(page>1?' — Page '+page:''),description:'Les dernières actualités de la rubrique '+label+' sur TV+ Afrique.',alternates:{canonical:(await getSiteUrl())+'/rubrique/'+slug+(page>1?'?page='+page:'')},robots:{index:items.length>0,follow:true}};
}
export async function generateStaticParams(){
 // Même tolérance que pour les articles : le build ne doit pas dépendre de l'API LWS.
 try {
  const {data:categories}=await getCategories();
  return (categories.length?categories:staticCategories).map(c=>({slug:categorySlug(c)}));
 } catch {
  return staticCategories.map(c=>({slug:categorySlug(c)}));
 }
}
export default async function Category({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{page?:string}>}){
 const {slug}=await params;
 const normalizedSlug=categorySlug(decodeURIComponent(slug));
 const {data:categories}=await getCategories();
 const label=(categories.length?categories:staticCategories).find(c=>categorySlug(c)===normalizedSlug);
 if(!label)notFound();
 const search=await searchParams;
 const page=Math.min(2000,Math.max(1,Math.floor(Number(search.page)||1)));
 const {items,total}=await listArticles({category:normalizedSlug,page,pageSize:PAGE_SIZE});
 const totalPages=Math.max(1,Math.ceil(total/PAGE_SIZE));
 const featuredItems=page===1?items.slice(1,5):[];
 const gridItems=page===1?items.slice(5):items;
 return <main className="shell category-page">
  <Breadcrumb items={[{label:'Accueil',href:'/'},{label}]}/>
  <h1 className="page-title">{label}</h1>
  <p className="page-intro">Toute l'actualité de la rubrique {label.toLowerCase()}, classée du plus récent au plus ancien. {total.toLocaleString('fr-FR')} publications.</p>
  {items.length?<>
    {page===1&&<div className="category-hero">
      <StoryCard story={items[0]} variant="hero"/>
      {featuredItems.length > 0 && (
        <ArticleScroll label="Articles mis en avant" featured>
          <div className="hero-rail">
            {featuredItems.map(s => <StoryCard key={s.shortId || s.slug} story={s} variant="rail" />)}
          </div>
        </ArticleScroll>
      )}
    </div>}
    {gridItems.length > 0 && (
      <ArticleScroll label={page === 1 ? 'Autres articles de la rubrique' : 'Articles de la rubrique'}>
        <div className="selection-grid">
          {gridItems.map(s => <StoryCard key={s.shortId || s.slug} story={s} />)}
        </div>
      </ArticleScroll>
    )}
  </>:<p className="empty-state">Aucun article sur cette page.</p>}
  <ArticlePagination path={'/rubrique/'+normalizedSlug} page={page} totalPages={totalPages}/>
 </main>;
}
