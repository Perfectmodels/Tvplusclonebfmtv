import Link from 'next/link';
import {PlayCircle,Headphones} from 'lucide-react';
import type {CatalogItem} from '../lib/media/catalog';
export default function CatalogBrowser({items,available=true,vertical=false}:{items:CatalogItem[];available?:boolean;vertical?:boolean}){
 if(!available)return <p className="empty-state">La vidéothèque est temporairement indisponible.</p>;
 if(!items.length)return <p className="empty-state">Aucun contenu publié pour le moment.</p>;
 return <div className={'selection-grid'+(vertical?' tvplus-reel-grid':'')}>{items.map(m=><Link key={m.id} className="tvplus-media-tile" href={'/media/'+m.id}><span className="tvplus-media-thumb" style={vertical?{aspectRatio:'9/16'}:undefined}>{m.thumbnail_url&&<img src={m.thumbnail_url} alt="" loading="lazy"/>}{m.kind==='podcast'?<Headphones size={32}/>:<PlayCircle size={32}/>}</span><small>{m.category}</small><strong>{m.title}</strong>{m.description&&<span>{m.description}</span>}</Link>)}</div>;
}
