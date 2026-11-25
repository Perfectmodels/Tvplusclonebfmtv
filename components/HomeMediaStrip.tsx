import Link from 'next/link';
import {PlayCircle,Headphones} from 'lucide-react';
export type StripItem={id:string;title:string;image?:string;href:string;meta?:string};
export default function HomeMediaStrip({title,href,items,vertical=false,red=false,audio=false}:{title:string;href:string;items:StripItem[];vertical?:boolean;red?:boolean;audio?:boolean}){
 if(!items.length)return null;
 return <section className={'tvplus-media-strip'+(red?' is-red':'')} aria-label={title}>
  <header><h2>{title}</h2><Link href={href}>Tout voir →</Link></header>
  <div className={'tvplus-media-track'+(vertical?' is-vertical':'')} tabIndex={0} role="region" aria-label={'Défiler : '+title}>
   {items.map(item=><Link key={item.id} href={item.href} className="tvplus-media-tile"><span className="tvplus-media-thumb">{item.image&&<img src={item.image} alt="" loading="lazy" decoding="async"/>}{audio?<Headphones size={30}/>:<PlayCircle size={34}/>}</span><strong>{item.title}</strong>{item.meta&&<small>{item.meta}</small>}</Link>)}
  </div>
 </section>;
}
