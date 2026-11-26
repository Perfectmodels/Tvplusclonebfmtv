'use client';

import {useState} from 'react';
import Link from 'next/link';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import type {Story} from '../lib/data';
import {articlePath} from '../lib/articles/urls';
import {categorySlug} from '../lib/categories';
import StoryCard from './StoryCard';
import SectionHeading from './SectionHeading';
import { useSwipeNavigation } from '../lib/client/use-swipe-navigation';

const PAGE_SIZE=4;

export default function CategoryNewsCarousel({
 title,items,moreHref,sectionId,selection=false,
}:{title:string;items:Story[];moreHref?:string;sectionId:string;selection?:boolean;}){
 const [page,setPage]=useState(1);
 const [saved,setSaved]=useState<Record<number,Story[]>>({1:items.slice(0,PAGE_SIZE)});
 const [total,setTotal]=useState<number|null>(selection?items.length:null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const cached=selection ? items.slice((page-1)*PAGE_SIZE,page*PAGE_SIZE) : saved[page]||[];
 const knownTotal=selection?items.length:total;
 const totalPages=knownTotal===null?null:Math.max(1,Math.ceil(knownTotal/PAGE_SIZE));
 const nextAllowed=totalPages===null||page<totalPages;

 async function navigate(next:number){
  if(next===page||next<1||(totalPages!==null&&next>totalPages)||busy)return;
  if(selection||saved[next]){setPage(next);setError('');return;}
  setBusy(true);setError('');
  try{
   const url='/api/articles?'+new URLSearchParams({
    category:categorySlug(title),page:String(next),pageSize:String(PAGE_SIZE),
   }).toString();
   const res=await fetch(url,{cache:'no-store'});
   const json=await res.json();
   if(!res.ok||!json?.success)throw new Error('Impossible de charger les articles');
   const pageData=json.data?.items as Story[]|undefined;
   if(!Array.isArray(pageData))throw new Error('Liste indisponible');
   setTotal(Number(json.data?.total)||0);
   if(pageData.length){setSaved(prev=>({...prev,[next]:pageData}));setPage(next);}
  }catch{setError('Chargement impossible. Réessayez.');}
  finally{setBusy(false);}
 }
 const swipe = useSwipeNavigation({
  onNext: () => void navigate(page + 1),
  onPrev: () => void navigate(page - 1),
 });
 if(!cached.length&&!selection)return null;
 const first=cached[0];
 const related=cached.slice(1);
 const windowStart=totalPages===null?1:Math.max(1,Math.min(totalPages-4,page-2));
 const displayed=totalPages===null?Array.from(new Set([1,page,page+1])):Array.from(
  {length:Math.min(totalPages,5)},(_,i)=>windowStart+i,
 );
 return <section className={'editorial-category-section'+(selection?' is-selection':'')} aria-labelledby={sectionId}>
  <SectionHeading id={sectionId} title={title} moreHref={selection?moreHref:undefined}
   moreLabel={selection?'Toutes les rubriques':undefined}/>
  <div className="editorial-category-layout">
   <div className="editorial-category-feature"><StoryCard story={first} variant="hero"/></div>
   <div className="editorial-category-side" aria-label={'Autres articles — '+title}>
    <div className="editorial-side-toolbar">
     <span>Articles de la rubrique</span>
     <div className="editorial-side-actions">
      <span className="editorial-side-count">Page {page}{totalPages!==null?' / '+totalPages:''}</span>
      <button type="button" disabled={page===1||busy} onClick={()=>void navigate(page-1)}
        aria-label={'Page précédente — '+title}><ChevronLeft size={17}/></button>
      <button type="button" disabled={!nextAllowed||busy} onClick={()=>void navigate(page+1)}
        aria-label={'Page suivante — '+title}><ChevronRight size={17}/></button>
     </div>
    </div>
    <div className="editorial-side-viewport" {...swipe}>
     <div className="editorial-side-track">
      <div className="editorial-side-slide">
       {related.length?related.map(story=>
        <Link key={story.shortId||story.slug} href={articlePath(story)} className="editorial-mini-article">
         <span className="editorial-mini-thumb">
          {story.image?<img src={story.image} alt="" loading="lazy" decoding="async"/>:
            <span className="editorial-mini-placeholder">TV+</span>}
         </span>
         <span className="editorial-mini-body">
          <span className="editorial-mini-category">{story.category}</span>
          <strong>{story.title}</strong><time>{story.time}</time>
         </span>
        </Link>):<div className="editorial-side-empty">Aucun autre titre sur cette page.</div>}
      </div>
     </div>
    </div>
    <nav className="editorial-side-dots" aria-label={'Pagination — '+title}>
     {displayed.map(n=>
      <button type="button" key={n} disabled={busy} aria-current={page===n?'page':undefined}
       aria-label={'Page '+n+' — '+title} className={page===n?'is-active':''}
       onClick={()=>void navigate(n)}>{n}</button>
     )}
    </nav>
    {busy&&<p className="editorial-category-loading" role="status">Chargement des articles…</p>}
    {error&&<p className="editorial-category-error" role="alert">{error}</p>}
   </div>
  </div>
 </section>;
}
