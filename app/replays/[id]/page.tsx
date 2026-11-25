import type {Metadata} from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getEpisodeById} from '../../../lib/db/repository';
import {getSiteUrl} from '../../../lib/articles/site-url';
import {videoSeo} from '../../../lib/seo/video';
import {parseVideoUrl} from '../../../lib/video/providers';
import ReplayEmbed from '../../../components/video/ReplayEmbed';
import Breadcrumb from '../../../components/Breadcrumb';
import {cache} from 'react';
export const revalidate=120;
const getEpisode=cache(getEpisodeById);
type Props={params:Promise<{id:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const episode=await getEpisode((await params).id);
 if(!episode||!parseVideoUrl(episode.videoUrl))return {title:'Replay introuvable',robots:{index:false,follow:false}};
 const base=await getSiteUrl();const url=base+'/replays/'+encodeURIComponent(episode.id);
 const seo=videoSeo(episode,base);
 return {title:episode.title+' — Replay TV+ Afrique',description:episode.description||episode.title,alternates:{canonical:url},robots:{index:!!seo,follow:true,googleBot:{index:!!seo,follow:true,'max-image-preview':'large'}},openGraph:{type:'website',title:episode.title,url,description:episode.description||episode.title,images:seo?[seo.thumbnail]:[]}};
}
export default async function ReplayPage({params}:Props){
 const episode=await getEpisode((await params).id);
 if(!episode||!parseVideoUrl(episode.videoUrl))notFound();
 const seo=videoSeo(episode,await getSiteUrl());
 const schema=seo?{'@context':'https://schema.org','@type':'VideoObject',name:seo.title,description:seo.description,thumbnailUrl:[seo.thumbnail],uploadDate:seo.uploadDate,embedUrl:seo.embedUrl,url:seo.url}:null;
 return <main className="shell listing-page">
 {schema&&<script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,'\\u003c')}}/>}
 <Breadcrumb items={[{label:'Accueil',href:'/'},{label:'Replays',href:'/replays'},{label:episode.title}]}/>
 <h1 className="page-title">{episode.title}</h1>
 {seo ? <div className="tvplus-replay-embed"><iframe src={seo.embedUrl} title={episode.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" style={{width:'100%',aspectRatio:'16 / 9',border:0}}/></div> : <ReplayEmbed title={episode.title} url={episode.videoUrl} thumbnail={episode.thumbnail}/>}
 {seo&&<p><time dateTime={seo.uploadDate}>{new Date(seo.uploadDate).toLocaleDateString('fr-FR',{timeZone:'Africa/Libreville'})}</time></p>}
 {episode.description&&<p className="page-intro">{episode.description}</p>}
 <Link href="/replays">Tous les replays TV+ Afrique</Link>
 </main>;
}
