import Link from 'next/link';
import Breadcrumb from '../../components/Breadcrumb';

const entries = [
  { name:'WhatsApp officiel', url:'https://l.tvplusafrique.com/xw7b', detail:'Abonnez-vous à la chaîne WhatsApp de TV+ Afrique.', external:true, icon:'WA' },
  { name:'Le direct', url:'/direct', detail:'Regarder les émissions en direct sur le site TV+ Afrique.', external:false, icon:'TV' },
  { name:'Replays', url:'/replays', detail:'Voir les émissions déjà diffusées.', external:false, icon:'RP' },
  { name:'Dernières actualités', url:'/actualites', detail:'Retrouver les publications de la rédaction.', external:false, icon:'AC' },
] as const;

export default function SuivezNousPage() {
 return <main className="shell listing-page">
  <Breadcrumb items={[{label:'Accueil',href:'/'},{label:'Suivez-nous'}]}/>
  <h1 className="page-title">Suivez TV+ Afrique</h1>
  <p className="page-intro">Retrouvez les canaux vérifiés de TV+ Afrique et accédez à nos contenus. Les profils non confirmés ne sont pas proposés à la place des comptes officiels.</p>
  <div className="service-grid">
   {entries.map(entry => {
    const content=<><span className="service-icon" aria-hidden="true">{entry.icon}</span><strong>{entry.name}</strong><span>{entry.detail}</span></>;
    return entry.external
      ? <a key={entry.name} href={entry.url} target="_blank" rel="noopener noreferrer" className="service-card">{content}</a>
      : <Link key={entry.name} href={entry.url} className="service-card">{content}</Link>;
   })}
  </div>
 </main>;
}
