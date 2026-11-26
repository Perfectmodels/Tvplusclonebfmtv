import Link from 'next/link';
import {ArrowRight,PlayCircle,Headphones,Quote} from 'lucide-react';
export type StripItem={id:string;title:string;image?:string;href:string;meta?:string};
export default function HomeMediaStrip({id,title,href,items,vertical=false,red=false,audio=false,emptyMessage}:{id?:string;title:string;href:string;items:StripItem[];vertical?:boolean;red?:boolean;audio?:boolean;emptyMessage?:string}){
 if(!items.length&&!emptyMessage)return null;
 const Icon=red?Quote:audio?Headphones:PlayCircle;
 return <section id={id} className={'tvplus-media-strip'+(red?' is-red':'')} aria-label={title}>
  <header><h2>{title}</h2><Link href={href} aria-label={'Tout voir · '+title}>Tout voir <ArrowRight size={16}/></Link></header>
  {items.length?<div className={'tvplus-media-track'+(vertical?' is-vertical':audio?' is-audio':'')} tabIndex={0} role="region" aria-label={'Défiler : '+title}>
   {items.map(item=><Link key={item.id} href={item.href} className="tvplus-media-tile"><span className="tvplus-media-thumb">{item.image&&<img src={item.image} alt="" loading="lazy" decoding="async"/>}<Icon size={32} aria-hidden="true"/></span><strong>{item.title}</strong>{item.meta&&<small>{item.meta}</small>}</Link>)}
  </div>:<p className="empty-state">{emptyMessage}</p>}
 </section>;
}
