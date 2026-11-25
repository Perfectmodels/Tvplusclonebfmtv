import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {cache} from 'react';
import {GABON_PROVINCES} from '../../../lib/editor/countries';
import {listArticles} from '../../../lib/db/repository';
import {getSiteUrl} from '../../../lib/articles/site-url';
import StoryCard from '../../../components/StoryCard';
import Breadcrumb from '../../../components/Breadcrumb';
import ArticlePagination from '../../../components/ArticlePagination';
export const revalidate=120;
const PAGE_SIZE=15;
type Props={params:Promise<{slug:string}>;searchParams:Promise<{page?:string}>};
const data=cache((province:string,page:number)=>listArticles({country:'GA',province,page,pageSize:PAGE_SIZE}));
async function resolve({params,searchParams}:Props){const slug=(await params).slug;const province=GABON_PROVINCES.find(p=>p.value===slug);const page=Math.min(500,Math.max(1,Math.floor(Number((await searchParams).page)||1)));return {province,page};}
export async function generateMetadata(props:Props):Promise<Metadata>{
 const {province,page}=await resolve(props);if(!province)return {title:'Province introuvable',robots:{index:false,follow:false}};
 const {items}=await data(province.value,page);
 return {title:province.label+' — Actualités du Gabon | TV+ Afrique'+(page>1?' — Page '+page:''),description:'Retrouvez les informations publiées par TV+ Afrique concernant la province '+province.label+'.',alternates:{canonical:(await getSiteUrl())+'/provinces/'+province.value+(page>1?'?page='+page:'')},robots:{index:items.length>0,follow:true}};
}
export default async function ProvincePage(props:Props){
 const {province,page}=await resolve(props);if(!province)notFound();
 const {items,total}=await data(province.value,page);
 return <main className="shell category-page"><Breadcrumb items={[{label:'Accueil',href:'/'},{label:'Gabon',href:'/pays/ga'},{label:province.label}]}/><h1 className="page-title">Actualités — {province.label}</h1><p className="page-intro">Les articles de TV+ Afrique concernant cette province du Gabon.</p><nav className="rubrique-chips" aria-label="Provinces">{GABON_PROVINCES.map(p=><Link key={p.value} href={'/provinces/'+p.value} aria-current={p.value===province.value?'page':undefined}>{p.label}</Link>)}</nav>{items.length?<div className="selection-grid">{items.map(s=><StoryCard key={s.shortId||s.slug} story={s}/>)}</div>:<p className="empty-state">Aucun article géolocalisé dans cette province pour le moment.</p>}<ArticlePagination path={'/provinces/'+province.value} page={page} totalPages={Math.max(1,Math.ceil(total/PAGE_SIZE))}/></main>;
}
