import Link from 'next/link';
import type {Metadata} from 'next';
import {getSiteUrl} from '../lib/articles/site-url';
import AlertBar from '../components/AlertBar';
import Newsletter from '../components/Newsletter';
import QuestionSection from '../components/QuestionSection';
import FilActuFeed from '../components/FilActuFeed';
import NewsTicker from '../components/NewsTicker';
import HomePremiumCard from '../components/video/HomePremiumCard';
import AdvertisingCarousel from '../components/AdvertisingCarousel';
import {getHomepageAds} from '../lib/ads/v2';
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
 const strips=layout.order.filter(id=>!layout.hidden.includes(id)).map(id=>stripMap[id]).filter(s=>s.items.length);
 return <>{alert&&<AlertBar title={alert.title} href={articlePath(alert)} time={alert.time}/>}
 <main className="shell">
 <SectionHeading id="home-top-stories-title" title="À la une" moreHref="/actualites" moreLabel="Toutes les actualités"/>
 <div className="tvplus-home-lead">
  <div className="tvplus-home-main">
   {hero?<StoryCard story={hero} variant="hero"/>:<p className="empty-state">Les actualités à la une seront bientôt disponibles.</p>}
   <section className="tvplus-home-feed" id="fil-info"><SectionHeading title="Fil actu"/><FilActuFeed items={feed} total={Math.max(0,(result?.total??articles.length)-excluded.length)} excludeSlugs={excluded}/></section>
  </div>
  <aside className="tvplus-home-aside"><HomePremiumCard/><NewsTicker items={wire.items.map(({id,time,title})=>({id,time,title}))} variant="rail" limit={20}/><AdvertisingCarousel placement="after-live" ads={ads['after-live']}/></aside>
 </div>
 <AdvertisingCarousel placement="after-hero" ads={ads['after-hero']}/>
 {videoArticles.length>0&&<HomeMediaStrip title="L’actualité en vidéo" href="/articles-video" items={videoArticles.map(s=>({id:s.slug,title:s.title,image:s.image,href:articlePath(s),meta:s.category}))}/>}
 {selection.length>0&&<CategoryNewsCarousel title="Sélection de la rédaction" sectionId="selection-title" items={selection} moreHref="/actualites" selection/>}
 <AdvertisingCarousel placement="after-selection" ads={ads['after-selection']}/>
 <div className="home-category-stack">{blocks.map((block,i)=><section key={block.name}><CategoryNewsCarousel title={block.name} sectionId={'cat-'+categorySlug(block.name)} items={block.items} moreHref={categoryHref(block.name)}/>{strips[i]&&<HomeMediaStrip {...strips[i]}/>}{i===1&&<AdvertisingCarousel placement="after-feed" ads={ads['after-feed']}/>}</section>)}
 {strips.slice(blocks.length).map(s=><HomeMediaStrip key={s.href} {...s}/>)}
 {blocks.length<2&&<AdvertisingCarousel placement="after-feed" ads={ads['after-feed']}/>}
 </div>
 <section className="category-block" aria-label="Explorer les contenus"><SectionHeading title="Toutes les actualités" moreHref="/actualites" moreLabel="Voir tous les articles"/><div className="rubrique-chips">{categories.map(c=><Link key={c} href={categoryHref(c)}>{c}</Link>)}</div><div className="rubrique-chips">{[['Articles vidéo','/articles-video'],['Reels','/reels'],['Reportages','/videos'],['Ligne Rouge','/ligne-rouge'],['Podcasts','/podcasts'],['Émissions et replays','/replay-emissions'],['Grille des programmes','/programme-tv'],['Direct Premium','/direct']].map(([name,url])=><Link key={url} href={url}>{name}</Link>)}</div></section>
 <section className="home-question-section" aria-label="Questions du public"><QuestionSection/></section>
 <AdvertisingCarousel placement="before-newsletter" ads={ads['before-newsletter']}/><Newsletter/>
 </main></>;
}
