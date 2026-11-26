'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,ArrowRight} from 'lucide-react';
import TvPlusLogo from './TvPlusLogo';
import {articlePath} from '../lib/articles/urls';
export type FeedItem={time:string;category:string;title:string;summary:string;slug:string;image?:string;shortId?:string;publishedAt?:string};
const SIZE=10;
function dateLabel(item:FeedItem){const d=item.publishedAt?new Date(item.publishedAt):null;return d&&Number.isFinite(d.valueOf())?new Intl.DateTimeFormat('fr-FR',{timeZone:'Africa/Libreville',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(d):item.time;}
function FeedThumbnail({image}:{image?:string}){
 const source=image?.trim()||'';
 const [failedSource,setFailedSource]=useState<string|null>(null);
 const showCover=!!source&&failedSource!==source;
 return <span className="tvplus-chronicle-thumbnail" aria-hidden="true">
  <span className="tvplus-chronicle-placeholder"><TvPlusLogo/></span>
  {showCover&&<img key={source} className="tvplus-chronicle-cover" src={source} alt="" width={144} height={96} loading="lazy" decoding="async" onError={()=>setFailedSource(source)}/>}
 </span>;
}
export default function FilActuFeed({items,categories=[],total,excludeSlugs=[]}:{items:FeedItem[];categories?:string[];total?:number;excludeSlugs?:string[]}){
 const [page,setPage]=useState(1),[rows,setRows]=useState(items.slice(0,SIZE)),[count,setCount]=useState(total??items.length),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const controller=useRef<AbortController|null>(null);
 useEffect(()=>()=>controller.current?.abort(),[]);
 const pages=Math.max(1,Math.ceil(count/SIZE));
 async function go(next:number){
  if(next<1||next>pages||busy)return;
  if(total===undefined){setRows(items.slice((next-1)*SIZE,next*SIZE));setPage(next);return;}
  controller.current?.abort();const ctrl=new AbortController();controller.current=ctrl;setBusy(true);setError('');
  try{const query=new URLSearchParams({page:String(next)});excludeSlugs.forEach(s=>query.append('exclude',s));
   const response=await fetch('/api/public/fil-actu?'+query,{signal:ctrl.signal});const data=await response.json();
   if(!response.ok)throw Error('Le fil est temporairement indisponible.');
   if(!ctrl.signal.aborted){setRows(data.items);setCount(data.total);setPage(next);}
  }catch(e){if(!ctrl.signal.aborted)setError(e instanceof Error?e.message:'Impossible de charger le fil.');}
  finally{if(!ctrl.signal.aborted)setBusy(false);}
 }
 const start=Math.max(1,Math.min(pages-4,page-2));
 return <div className="tvplus-chronicle" aria-busy={busy}>
  {error&&<p role="alert">{error}</p>}
  {rows.length?<ol className="tvplus-chronicle-list">{rows.map((item,index)=><li key={item.shortId||item.slug}>
   <Link href={articlePath(item)} className={'tvplus-chronicle-row'+(index===0?' is-latest':'')}>
    <span className="tvplus-chronicle-time">{dateLabel(item)}</span>
    <FeedThumbnail image={item.image}/>
    <span className="tvplus-chronicle-copy"><span className="category-label">{item.category}</span><strong>{item.title}</strong>{item.summary&&<small className="tvplus-chronicle-summary">{item.summary}</small>}</span>
    <ChevronRight size={16} aria-hidden="true"/>
   </Link></li>)}</ol>:<p className="empty-state">Aucune actualité disponible.</p>}
  {pages>1&&<nav className="tvplus-chronicle-pages" aria-label="Pagination du fil actu">
   <button type="button" disabled={busy||page===1} onClick={()=>void go(page-1)} aria-label="Page précédente"><ChevronLeft size={18}/></button>
   {Array.from({length:Math.min(5,pages)},(_,i)=>start+i).map(n=><button type="button" key={n} disabled={busy} aria-current={n===page?'page':undefined} onClick={()=>void go(n)}>{n}</button>)}
   <button type="button" disabled={busy||page>=pages} onClick={()=>void go(page+1)} aria-label="Page suivante"><ChevronRight size={18}/></button>
  </nav>}
  {count>0&&<p className="tvplus-chronicle-count" aria-live="polite">{busy?'Chargement…':`${(page-1)*SIZE+1}–${Math.min(page*SIZE,count)} sur ${count} articles`}</p>}
  <Link className="tvplus-all-articles" href="/actualites">Voir tous les articles <ArrowRight size={16}/></Link>
 </div>;
}
