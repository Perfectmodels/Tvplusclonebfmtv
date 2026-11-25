import {notFound} from 'next/navigation';
import Link from 'next/link';
import {cache} from 'react';
import {catalogItem} from '../../../lib/media/catalog';
import {parseVideoUrl} from '../../../lib/video/providers';
import ReplayEmbed from '../../../components/video/ReplayEmbed';
const get=cache(catalogItem);
export const revalidate=120;
type Props={params:Promise<{id:string}>};
export async function generateMetadata({params}:Props){const m=await get((await params).id);return m?{title:m.title+' — TV+ Afrique',description:m.description,alternates:{canonical:'/media/'+m.id},openGraph:{images:m.thumbnail_url?[m.thumbnail_url]:[]}}:{robots:{index:false,follow:false}};}
export default async function MediaPage({params}:Props){
 const m=await get((await params).id);if(!m)notFound();
 const direct=/^https:\/\/[^\s]+\.(mp4|webm|mp3|ogg|wav|m4a)(?:\?.*)?$/i.test(m.source_url);
 return <main className="shell listing-page"><p><Link href={m.kind==='reel'?'/reels':m.kind==='podcast'?'/podcasts':'/videos'}>← Tous les contenus</Link></p><h1 className="page-title">{m.title}</h1>{m.kind==='podcast'?(direct?<audio controls preload="none" src={m.source_url} style={{width:'100%'}}/>:<a href={m.source_url} target="_blank" rel="noopener noreferrer">Écouter sur la plateforme</a>):parseVideoUrl(m.source_url)?<ReplayEmbed title={m.title} url={m.source_url} thumbnail={m.thumbnail_url}/>:direct?<video controls preload="metadata" poster={m.thumbnail_url||undefined} src={m.source_url} style={{width:'100%',maxHeight:'80vh'}}/>:<a href={m.source_url} target="_blank" rel="noopener noreferrer">Voir la vidéo</a>}<p className="page-intro">{m.description}</p></main>;
}
