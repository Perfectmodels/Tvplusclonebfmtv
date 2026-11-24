import Link from 'next/link';
export default function ArticlePagination({path,page,totalPages,query}:{path:string;page:number;totalPages:number;query?:Record<string,string|undefined>}) {
 if(totalPages<=1)return null;
 const build=(n:number)=>{const params=new URLSearchParams();for(const [k,v] of Object.entries(query||{})){if(v)params.set(k,v);}if(n>1)params.set('page',String(n));return path+(params.size?'?'+params.toString():'');};
 const start=Math.max(1,Math.min(totalPages-4,page-2));
 const indexes=Array.from({length:Math.min(5,totalPages)},(_,i)=>start+i);
 return <nav className="pagination-nav" aria-label="Pagination des articles">
  {page>1?<Link href={build(page-1)} prefetch={false}>Précédent</Link>:<span className="is-disabled">Précédent</span>}
  {indexes.map(n=><Link key={n} href={build(n)} aria-current={n===page?'page':undefined} prefetch={false}>{n}</Link>)}
  {page<totalPages?<Link href={build(page+1)} prefetch={false}>Suivant</Link>:<span className="is-disabled">Suivant</span>}
 </nav>;
}
