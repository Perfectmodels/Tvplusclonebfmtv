import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getV2Actor} from '../../../../lib/auth/v2-admin';
import {listStudioItems} from '../../../../lib/media/studio-repository';
import {kinds,formats,canManageStudio,type StudioItem} from '../../../../lib/media/studio-types';
import '../studio.css';
export default async function CalendarPage(){const actor=await getV2Actor();if(!actor)redirect('/connexion?next=/admin-v2/studio/calendar');const allowed=kinds.filter(k=>canManageStudio(actor.permissions,k));if(!allowed.length)redirect('/acces-refuse');
 const results=await Promise.allSettled(allowed.map(kind=>listStudioItems(kind,'scheduled','',1)));
 const rows=results.flatMap(r=>r.status==='fulfilled'?r.value.items:[]).filter(x=>x.published_at&&Number.isFinite(Date.parse(x.published_at))).sort((a,b)=>Date.parse(a.published_at!)-Date.parse(b.published_at!));
 const date=new Intl.DateTimeFormat('fr-FR',{dateStyle:'full',timeZone:'Africa/Libreville'}),clock=new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Libreville'}),group=new Map<string,StudioItem[]>();
 for(const row of rows){const day=date.format(new Date(row.published_at!));group.set(day,[...(group.get(day)||[]),row]);}
 return <div className="studio-shell"><header className="studio-head"><div><Link className="studio-back" href="/admin-v2/studio">← Studio audiovisuel</Link><p className="studio-kicker">PUBLICATION · HEURE DE LIBREVILLE</p><h1>Programmation audiovisuelle</h1><p>Les 20 prochaines publications par format accessible. Pour consulter tous les contenus, ouvrez le catalogue correspondant.</p></div></header>
 {results.some(r=>r.status==='rejected')&&<p role="alert" className="v2-error">Une partie du calendrier est indisponible. Vérifiez la connexion à l'API.</p>}
 {!rows.length&&results.every(r=>r.status==='fulfilled')&&<section className="studio-panel"><p>Aucun contenu programmé. Programmez une publication depuis l’éditeur du contenu.</p></section>}
 {[...group.entries()].map(([day,items])=><section className="studio-calendar-day" key={day}><h2>{day}</h2>{items.map(item=><article key={item.id} className="studio-calendar-entry"><time dateTime={item.published_at!}>{clock.format(new Date(item.published_at!))}</time><Link href={'/admin-v2/studio/'+formats[item.kind].slug+'/'+item.id+'/edit'}>{item.title}</Link><small>{formats[item.kind].title}</small></article>)}</section>)}</div>;
}
