import {notFound} from 'next/navigation';
import Breadcrumb from '../../../components/Breadcrumb';
import StoryCard from '../../../components/StoryCard';
import ArticlePagination from '../../../components/ArticlePagination';
import {COUNTRY_CODES,EDITORIAL_COUNTRIES,COUNTRIES} from '../../../lib/editor/countries';
import {listArticles} from '../../../lib/db/repository';
export const revalidate=60;
const PAGE_SIZE=15;
export default async function CountryPage({params,searchParams}:{params:Promise<{code:string}>;searchParams:Promise<{page?:string}>}) {
 const {code:raw}=await params;
 const code=raw.trim().toUpperCase();
 if(!COUNTRY_CODES.includes(code))notFound();
 const q=await searchParams;
 const page=Math.min(500,Math.max(1,Number(q.page)||1));
 const label=EDITORIAL_COUNTRIES.find(x=>x.code===code)?.name||COUNTRIES.find(x=>x.code===code)?.name||code;
 const {items,total}=await listArticles({country:code,page,pageSize:PAGE_SIZE});
 const totalPages=Math.max(1,Math.ceil(total/PAGE_SIZE));
 return <main className="shell category-page">
  <Breadcrumb items={[{label:'Accueil',href:'/'},{label:'Actualités par pays',href:'/pays/ga'},{label}]}/>
  <h1 className="page-title">Actualités — {label}</h1>
  <p className="page-intro">Retrouvez les articles de TV+ Afrique géolocalisés dans ce pays. Les rubriques sont distinctes du lieu d'implantation de la rédaction.</p>
  <div className="rubrique-chips" aria-label="Choisir un pays">
   {EDITORIAL_COUNTRIES.map(c=><a key={c.code} href={'/pays/'+c.code.toLowerCase()} className={c.code===code?'is-active':''}>{c.name}</a>)}
  </div>
  {items.length?<div className="selection-grid">{items.map(story=><StoryCard key={story.shortId||story.slug} story={story}/>)}</div>
  :<p className="empty-state">Aucun article géolocalisé pour {label} pour le moment. Les articles du Gabon ne sont pas classés automatiquement dans d'autres pays.</p>}
  <ArticlePagination path={'/pays/'+code.toLowerCase()} page={page} totalPages={totalPages}/>
 </main>;
}
