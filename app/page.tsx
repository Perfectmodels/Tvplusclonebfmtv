import Link from 'next/link';
import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import {MessageCircle} from 'lucide-react';
import {getSiteUrl} from '../lib/articles/site-url';
import AlertBar from '../components/AlertBar';
import QuestionSection from '../components/QuestionSection';
import FilActuFeed from '../components/FilActuFeed';
import NewsTicker from '../components/NewsTicker';
import AdvertisingCarousel from '../components/AdvertisingCarousel';
import {getHomepageAds,type Placement} from '../lib/ads/v2';
import SectionHeading from '../components/SectionHeading';
import StoryCard from '../components/StoryCard';
import CategoryNewsCarousel from '../components/CategoryNewsCarousel';
import HomeMediaStrip from '../components/HomeMediaStrip';
import {listArticles,getCategories,getPrograms,getEpisodes} from '../lib/db/repository';
import {readHomeConfig,type HomeBlock} from '../lib/editorial/home-config';
import {homeMediaCatalog} from '../lib/media/catalog';
import {distributeHomepageStories} from '../lib/editorial/home-distribution';
import {articlePath} from '../lib/articles/urls';
import {categoryHref,categorySlug} from '../lib/categories';
import {getNewsFeed} from '../lib/rss/news';
export const revalidate=60;
export async function generateMetadata({searchParams}:{searchParams:Promise<{q?:string}>}):Promise<Metadata>{
 const {q}=await searchParams;return q?.trim()?{title:'Recherche — TV+ Afrique',robots:{index:false,follow:true}}:{alternates:{canonical:await getSiteUrl(),types:{'application/rss+xml':'/rss.xml'}}};
}
export default async function Home({searchParams}:{searchParams:Promise<{q?:string}>}){
 const {q}=await searchParams;
 const result=await listArticles({search:q,pageSize:q?30:200}).catch(()=>null);
 const articles=result?.items??[];
 if(q)return <main className="shell"><section className="search-results"><SectionHeading title={'Résultats pour « '+q+' »'}/>{articles.length?<div className="selection-grid">{articles.map(s=><StoryCard story={s} key={s.slug}/>)}</div>:<p className="empty-state">Aucune actualité disponible pour cette recherche.</p>}</section></main>;
 const [wire,cats,ads,media,programs,episodes,layout]=await Promise.all([
  getNewsFeed(20).catch(()=>({items:[]})),getCategories().catch(()=>({data:[]})),getHomepageAds(),homeMediaCatalog(),getPrograms().catch(()=>({data:[]})),getEpisodes(500).catch(()=>({data:[]})),readHomeConfig()
 ]);
 const categories=cats.data;
 const {alert,hero,selection,feed,blocks,videoArticles}=distributeHomepageStories(articles,categories);
 const excluded=[alert?.slug,hero?.slug].filter((s):s is string=>!!s);
 const catalog=(kind:'reel'|'reportage'|'podcast')=>media.items.filter(m=>m.kind===kind).map(m=>({id:m.id,title:m.title,image:m.thumbnail_url,href:'/media/'+m.id,meta:m.category}));
 const line=programs.data.find(p=>p.slug==='ligne-rouge'||p.name.toLowerCase().trim()==='ligne rouge');
 const replay=(isLine:boolean)=>episodes.data.filter(e=>(!!e.videoUrl||!!e.legacyPage)&&(isLine?!!line&&e.programId===line.id:!line||e.programId!==line.id)).map(e=>({id:e.id,title:e.title,image:e.thumbnail,href:'/replays/'+e.id,meta:e.duration}));
 const reels=catalog('reel'),lineItems=replay(true),replays=replay(false),reports=catalog('reportage'),podcasts=catalog('podcast');
 const stripMap: Record<HomeBlock,{title:string;href:string;items:ReturnType<typeof catalog>;vertical?:boolean;red?:boolean;audio?:boolean}>={
  reels:{title:'TV+ Reels',href:'/reels',items:reels,vertical:true},
  'ligne-rouge':{title:'Ligne Rouge',href:'/ligne-rouge',items:lineItems,red:true},
  replays:{title:'À revoir en replay',href:'/replays',items:replays},
  reportages:{title:'Reportages TV+',href:'/videos',items:reports},
  podcasts:{title:'Podcasts TV+',href:'/podcasts',items:podcasts,audio:true}
 };
 // Keep the saved visibility settings and place replays immediately after reels by default.
 const order=[...layout.order];
 if(order.join(',')==='reels,ligne-rouge,replays,reportages,podcasts') {
  order.splice(0,3,'reels','replays','ligne-rouge');
 }
 const strips=order.filter(id=>!layout.hidden.includes(id)).map(id=>stripMap[id]).filter(s=>s.items.length);
 const articleVideos={title:'L’actualité en vidéo',href:'/articles-video',items:videoArticles.map(s=>({id:s.slug,title:s.title,image:s.image,href:articlePath(s),meta:s.category}))};
 const videos=[...strips];
 if(articleVideos.items.length) {
  const reportIndex=videos.findIndex(s=>s.href==='/videos');
  videos.splice(reportIndex<0?videos.length:reportIndex+1,0,articleVideos);
 }
 // The first two editorial sections follow the requested examples when available.
 const preferred=['economie','education','politique','societe'];
 const rank=(name:string)=>{const index=preferred.indexOf(categorySlug(name));return index<0?preferred.length:index;};
 const editorialBlocks=[...blocks].sort((a,b)=>rank(a.name)-rank(b.name));
 const placements:Placement[]=['after-hero','after-feed','after-live','after-selection','before-newsletter'];
 const sections:ReactNode[]=[];
 let previousWasAd=false;
 const appendContent=(node:ReactNode)=>{sections.push(node);previousWasAd=false;};
 const appendAd=()=>{
  if(previousWasAd)return;
  while(placements.length){
   const placement=placements.shift()!;
   if(!ads[placement].length)continue;
   sections.push(<AdvertisingCarousel key={placement} placement={placement} ads={ads[placement]}/>);
   previousWasAd=true;
   return;
  }
 };
 const appendCategory=()=>{
  const block=editorialBlocks.shift();
  if(block)appendContent(<CategoryNewsCarousel key={'cat-'+categorySlug(block.name)} title={block.name} sectionId={'cat-'+categorySlug(block.name)} items={block.items} moreHref={categoryHref(block.name)}/>);
 };
 const appendVideo=()=>{
  const strip=videos.shift();
  if(strip)appendContent(<HomeMediaStrip key={strip.href} {...strip}/>);
 };
 // After the lead: ad, first topic, reels; then topic, ad, media.
 appendAd();
 appendCategory();
 appendVideo();
 while(editorialBlocks.length||videos.length){
  appendCategory();
  appendAd();
  appendVideo();
 }
 if(selection.length){
  appendContent(<CategoryNewsCarousel key="selection" title="Sélection de la rédaction" sectionId="selection-title" items={selection} moreHref="/actualites" selection/>);
 }
 // Only publish ads with a real campaign and an editorial separator.
 appendAd();
 const whatsappNumber=(process.env.WHATSAPP_CONTACT_NUMBER??process.env.NEXT_PUBLIC_WHATSAPP_CONTACT_NUMBER??'').trim().replace(/[+\s().-]/g,'');
 const whatsappHref=/^[1-9]\d{7,14}$/.test(whatsappNumber)?'https://wa.me/'+whatsappNumber+'?text='+encodeURIComponent('Bonjour TV+ Afrique, je souhaite contacter la rédaction.'):null;
 return <>{alert&&<AlertBar title={alert.title} href={articlePath(alert)} time={alert.time}/>}
 <main className="shell">
 <SectionHeading id="home-top-stories-title" title="À la une" moreHref="/actualites" moreLabel="Toutes les actualités"/>
 <div className="tvplus-home-lead">
  <div className="tvplus-home-main">
   {hero?<StoryCard story={hero} variant="hero"/>:<p className="empty-state">Les actualités à la une seront bientôt disponibles.</p>}
   <section className="tvplus-home-feed" id="fil-info"><SectionHeading title="Fil actu"/><FilActuFeed items={feed} total={Math.max(0,(result?.total??articles.length)-excluded.length)} excludeSlugs={excluded}/></section>
  </div>
  <aside className="tvplus-home-aside"><NewsTicker items={wire.items.map(({id,time,title})=>({id,time,title}))} variant="rail" limit={20}/></aside>
 </div>
 <div className="home-category-stack">{sections}</div>
 <section className="category-block" aria-label="Grille des programmes"><SectionHeading title="Grille des programmes" moreHref="/programme-tv" moreLabel="Voir les horaires"/><p>Retrouvez les émissions et les rendez-vous à l’antenne de TV+ Afrique.</p><div className="rubrique-chips"><Link href="/programme-tv">Consulter la grille TV</Link><Link href="/replay-emissions">Toutes les émissions et leurs replays</Link></div></section>
 <section className="category-block" aria-label="Explorer les contenus"><SectionHeading title="Toutes les actualités" moreHref="/actualites" moreLabel="Voir tous les articles"/><div className="rubrique-chips">{categories.map(c=><Link key={c} href={categoryHref(c)}>{c}</Link>)}</div><div className="rubrique-chips">{[['Articles vidéo','/articles-video'],['Reels','/reels'],['Reportages','/videos'],['Ligne Rouge','/ligne-rouge'],['Podcasts','/podcasts'],['Émissions et replays','/replay-emissions'],['Grille des programmes','/programme-tv'],['Direct Premium','/direct']].map(([name,url])=><Link key={url} href={url}>{name}</Link>)}</div></section>
 <section className="home-question-section" aria-label="Questions du public"><QuestionSection/></section>
 <section className="newsletter" aria-label="Contacter TV+ Afrique sur WhatsApp">
  <div><h3>Écrivez à TV+ Afrique</h3><p>{whatsappHref?'Une information, un témoignage ou une question ? Ouvrez WhatsApp pour échanger avec la rédaction.':'Une information, un témoignage ou une question ? Contactez la rédaction ou suivez notre chaîne WhatsApp officielle.'}</p></div>
  {whatsappHref?<a className="newsletter-btn" href={whatsappHref} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} aria-hidden="true"/> Envoyer un message WhatsApp</a>:<div className="rubrique-chips"><Link href="/contacts">Contacter la rédaction</Link><a href="https://l.tvplusafrique.com/xw7b" target="_blank" rel="noopener noreferrer"><MessageCircle size={18} aria-hidden="true"/> Suivre sur WhatsApp</a></div>}
 </section>
 </main></>;
}
