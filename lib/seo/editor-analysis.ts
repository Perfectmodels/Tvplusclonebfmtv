export type SeoInput = {title:string; excerpt:string; seoTitle:string; seoDescription:string; slug:string; text:string; tags:string[]; hasCover:boolean; alt?:string; category:string; country:string};
const stop=new Set('avec dans pour sans sont cette comme plus leur leurs nous vous elle elles ils les des une aux sur par pas que qui dont est ses son ces du au et de le la un en gabon afrique tv'.split(' '));
export const seoTerms=(text:string)=>[...new Set(text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9]{3,}/g)||[])].filter(w=>!stop.has(w));
function shorten(value:string,max:number){const s=value.replace(/\s+/g,' ').trim();if(s.length<=max)return s;const cut=s.slice(0,max-1);return (cut.lastIndexOf(' ')>max/2?cut.slice(0,cut.lastIndexOf(' ')):cut)+'…';}
export function analyzeSeo(input:SeoInput){
 const title=input.seoTitle.trim()||input.title.trim();
 const description=input.seoDescription.trim()||input.excerpt.trim();
 const words=input.text.trim().split(/\s+/).filter(Boolean);
 const checks=[
 {label:'Titre explicite (15–75 caractères)',weight:15,ok:title.length>=15&&title.length<=75},
 {label:'Description informative (70–165 caractères)',weight:15,ok:description.length>=70&&description.length<=165},
 {label:'Adresse lisible',weight:10,ok:/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)},
 {label:'Chapeau autonome pour les moteurs de réponse',weight:10,ok:input.excerpt.trim().length>=70},
 {label:'Corps rédactionnel renseigné',weight:15,ok:words.length>=30},
 {label:'Mots-clés éditoriaux pertinents',weight:10,ok:input.tags.length>0&&input.tags.some(t=>seoTerms(t).some(w=>seoTerms(input.title+' '+input.text).includes(w)))},
 {label:'Image de couverture',weight:10,ok:input.hasCover},
 {label:'Texte alternatif de couverture',weight:5,ok:!!input.alt?.trim()},
 {label:'Rubrique et localisation',weight:10,ok:!!input.category&&!!input.country},
 ];
 const frequency=new Map<string,number>();for(const w of seoTerms(input.title+' '+input.excerpt+' '+input.text)){frequency.set(w,0);}
 const titleTerms=new Set(seoTerms(input.title));const excerptTerms=new Set(seoTerms(input.excerpt));
 for(const w of frequency.keys())frequency.set(w,(titleTerms.has(w)?3:0)+(excerptTerms.has(w)?2:0)+1);
 const suggestedTags=[...frequency].sort((a,b)=>b[1]-a[1]).slice(0,8).map(([w])=>w);
 return {checks,score:checks.reduce((sum,c)=>sum+(c.ok?c.weight:0),0),title:shorten(input.title,75),description:shorten(input.excerpt||input.text,155),suggestedTags};
}
