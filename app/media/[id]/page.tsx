import {notFound} from 'next/navigation';
import Link from 'next/link';
import {cache} from 'react';
import {catalogItem} from '../../../lib/media/catalog';
import {formats,blankMeta} from '../../../lib/media/studio-types';
import MediaPlayback from '../../../components/video/MediaPlayback';
import {durationLabel} from '../../../components/AvCatalog';
import Breadcrumb from '../../../components/Breadcrumb';
const get=cache(catalogItem);
export const revalidate=120;
type Props={params:Promise<{id:string}>};
export async function generateMetadata({params}:Props){const m=await get((await params).id);return m?{title:m.title+' — TV+ Afrique',description:m.description,alternates:{canonical:'/media/'+m.id},openGraph:{images:m.thumbnail_url?[m.thumbnail_url]:[]}}:{robots:{index:false,follow:false}};}
export default async function MediaPage({params}:Props){
 const m=await get((await params).id);if(!m)notFound();const f=formats[m.kind],meta=m.studio_meta??blankMeta(),related=meta.relatedArticle;
 return <main className="shell listing-page av-detail"><Breadcrumb items={[{label:'Accueil',href:'/'},{label:f.title,href:f.publicPath},{label:m.title}]}/><header className="av-public-head"><span className="category-label">{m.category||f.title}</span><h1 className="page-title">{m.title}</h1><div className="av-detail-meta">{[m.kind==='podcast'?meta.series:'',meta.season?'Saison '+meta.season:'',meta.episode?'Épisode '+meta.episode:'',durationLabel(m.duration_seconds),meta.host?'Avec '+meta.host:'',meta.journalist?'Par '+meta.journalist:'',meta.location,m.published_at?new Date(m.published_at.includes('T')?m.published_at:m.published_at.replace(' ','T')+'Z').toLocaleDateString('fr-FR',{timeZone:'Africa/Libreville'}):''].filter(Boolean).map((s,i)=><span key={i}>{s}</span>)}</div></header><div className={m.kind==='podcast'?'av-podcast-layout':undefined}><MediaPlayback key={m.id} kind={m.kind} title={m.title} source={m.source_url} cover={m.thumbnail_url} href={'/media/'+m.id}/><div className="av-detail-body">{m.description&&<p>{m.description}</p>}{m.legacyArticle&&<p><a href={m.legacyArticle} target="_blank" rel="noopener noreferrer">Consulter l’article d’origine sur TV+ Afrique</a></p>}{meta.caption&&<p>{meta.caption}</p>}{meta.guest&&<p><strong>Invités :</strong> {meta.guest}</p>}{meta.credits&&<p><strong>Crédits :</strong> {meta.credits}</p>}{related&&/^\/(?:a|article)\/[a-zA-Z0-9_-]+$/.test(related)&&<p><Link href={related}>Lire l'article associé</Link></p>}</div></div>{meta.transcript&&<section className="av-section"><h2>{m.kind==='reportage'?'Le reportage':'Transcription'}</h2><div className="av-detail-body">{meta.transcript}</div></section>}<Link href={f.publicPath}>← Tous les contenus {f.title}</Link></main>;
}
