import type {FeedItem} from '../lib/rss/feeds';
export default function NewsTicker({items,variant='full',limit=20}:{items:FeedItem[];variant?:'full'|'rail';limit?:number}){
 if(!items.length)return null;
 return <section className={'tvplus-alert-feed '+(variant==='rail'?'is-rail':'')} aria-label="Alerte Info, flux en continu">
 <header><span className="news-ticker-pulse" aria-hidden="true"/> <strong>ALERTE INFO</strong><small>EN CONTINU</small></header>
 <div className="tvplus-alert-feed-list" role="region" tabIndex={0} aria-label="Défiler les informations">
 {items.slice(0,limit).map(item=><div key={item.id} className="tvplus-alert-feed-item"><span>{item.time}</span><strong>{item.title}</strong></div>)}
 </div></section>;
}
