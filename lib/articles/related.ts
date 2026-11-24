import type {Story} from '../data';
import type {PublicArticle} from '../db/repository';

// Pondération sémantique légère : rubriques, mots-clés éditoriaux et champs SEO.
// Aucune IA payante ni nouvelle requête par suggestion.
const ignored = new Set(
  'le la les de des du un une et à au aux dans en sur pour par avec sans est sont plus que qui son sa ses comme d l ne pas ou mais ces ce cette cet se il elle a ont gabon afrique tv'.split(' ')
);
function words(value:string|undefined|null):Set<string>{
 return new Set((value||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .split(/[^a-z0-9]+/).filter(x=>x.length>=3&&!ignored.has(x)));
}
function matches(a:Set<string>,b:Set<string>){
 let count=0;for(const w of a){if(b.has(w))count++};return count;
}
export function relatedBySeo(article:PublicArticle, candidates:Story[], limit=4):Story[]{
 const articleTags=words((article.tags||article.keywords||[]).join(' '));
 const title=words([article.seoTitle||'',article.title].join(' '));
 const description=words([article.seoDescription||'',article.summary,article.chapter||''].join(' '));
 return candidates.filter(c=>c.slug!==article.slug).map((c,index)=>{
  const tags=words((c.tags||[]).join(' '));
  const heading=words((c.seoTitle||'')+' '+c.title);
  const body=words((c.seoDescription||'')+' '+c.summary);
  const category=c.category.toLowerCase()===article.category.toLowerCase()?10:0;
  const keywords=matches(articleTags,tags)*17 + matches(articleTags,heading)*8 + matches(title,tags)*10;
  const seo=matches(title,heading)*4 + matches(title,body)*2 + matches(description,heading)*2;
  const sameCountry=article.countryCode&&article.countryCode===c.countryCode?1:0;
  return {c,rank:category+keywords+seo+sameCountry+Math.max(0,3-index/60),index};
 }).sort((a,b)=>b.rank-a.rank||a.index-b.index).slice(0,limit).map(x=>x.c);
}
