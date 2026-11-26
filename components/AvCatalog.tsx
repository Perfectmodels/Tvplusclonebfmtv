import Link from 'next/link';
import {Headphones,PlayCircle} from 'lucide-react';
import type {CatalogItem} from '../lib/media/catalog';
export function durationLabel(seconds:number|null){if(!seconds)return '';const minutes=Math.floor(seconds/60),rest=seconds%60;return minutes?minutes+' min'+(rest?' '+rest+' s':''):rest+' s';}
export function AvCard({item}:{item:CatalogItem}){const Icon=item.kind==='podcast'?Headphones:PlayCircle;return <article className={'av-card '+item.kind}><Link prefetch={false} href={'/media/'+item.id} className="av-card-cover" aria-label={'Ouvrir '+item.title}>{item.thumbnail_url&&<img src={item.thumbnail_url} alt="" loading="lazy" decoding="async"/>}{(!item.thumbnail_url||item.kind!=='podcast')&&<Icon className={item.thumbnail_url?'av-card-play':undefined} size={32} aria-hidden="true"/>}</Link><small>{[item.kind==='podcast'?item.studio_meta?.series:item.category,durationLabel(item.duration_seconds)].filter(Boolean).join(' · ')}</small><Link prefetch={false} href={'/media/'+item.id}><strong>{item.title}</strong></Link>{item.description&&<p>{item.description}</p>}{item.studio_meta?.host&&<small>Avec {item.studio_meta.host}</small>}{item.studio_meta?.journalist&&<small>Par {item.studio_meta.journalist}</small>}</article>;}
export function AvPagination({path,page,total,size}:{path:string;page:number;total:number;size:number}){const pages=Math.max(1,Math.ceil(total/size));if(pages===1&&page===1)return null;return <nav className="av-page-nav" aria-label="Pages de contenus">{page>1&&<Link href={path+'?page='+(page-1)}>← Précédent</Link>}<span>Page {page} sur {pages}</span>{page<pages&&<Link href={path+'?page='+(page+1)}>Suivant →</Link>}</nav>;}


const videoFormats = [
  ['/reels', 'Reels'],
  ['/replays', 'Replays'],
  ['/videos', 'Reportages'],
  ['/articles-video', 'Articles vidéo'],
  ['/ligne-rouge', 'Ligne Rouge'],
  ['/podcasts', 'Podcasts'],
] as const;

export function AvPageHeader({ current, title, description }: { current: string; title: string; description?: string }) {
  return (
    <header className="av-public-head av-format-head">
      <h1 className="page-title">{title}</h1>
      {description && <p className="page-intro">{description}</p>}
      <nav className="av-format-nav" aria-label="Formats vidéo et audio">
        <Link href="/#espace-video">Espace vidéo</Link>
        {videoFormats.map(([href, label]) => (
          <Link key={href} href={href} aria-current={href === current ? 'page' : undefined}>{label}</Link>
        ))}
      </nav>
    </header>
  );
}
