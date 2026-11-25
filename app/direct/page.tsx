import Link from 'next/link';
import PremiumGate from '../../components/video/PremiumGate';
import {recipeActor} from '../../lib/payments/recipe-server';
import {premiumAccess} from '../../lib/video/premium';
import { ChevronRight } from 'lucide-react';
import Breadcrumb from '../../components/Breadcrumb';
import StoryCard from '../../components/StoryCard';
import DirectLiveStage from '../../components/video/DirectLiveStage';
import { getTvSchedule, listArticles } from '../../lib/db/repository';

export const dynamic='force-dynamic';
export const metadata={title:'Direct Premium — TV+ Afrique',alternates:{canonical:'/direct'}};

export default async function DirectPage() {
  const [access,{ data: schedule }, { items: stories },recipe] = await Promise.all([
    premiumAccess(),getTvSchedule().catch(()=>({data:[]})),
    listArticles({ pageSize: 4 }).catch(()=>({items:[]})),recipeActor(),
  ]);

  const today=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].indexOf(new Intl.DateTimeFormat('en-US',{weekday:'short',timeZone:'Africa/Libreville'}).format(new Date()))+1;
  return (
    <main className="shell direct-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Le direct' }]} />
      <div className="editorial-page-intro">
        <span className="editorial-eyebrow">TV+ AFRIQUE · ESPACE LIVE</span>
        <h1 className="page-title">L'espace Live TV+ Afrique</h1>
        <p className="page-intro">Accédez au direct de TV+ Afrique avec votre abonnement Premium.</p>
      </div>

      {recipe&&<p><Link href="/direct/recette" className="direct-cta">Ouvrir la recette de paiement (simulation)</Link></p>}
      <div className="direct-main-player">
        {access.entitled&&access.configured?<DirectLiveStage/>:<PremiumGate {...access}/>}
        <div className="direct-schedule">
          <h2>Programme TV+</h2>
          <p className="direct-schedule-intro">Les horaires renseignés par la rédaction.</p>
          {schedule.length ? (
            <ul>
              {schedule.filter(slot=>slot.weekday==null||slot.weekday===today||(today===7&&slot.weekday===0)).slice(0,5).map((slot) => (
                <li key={slot.time + slot.title}><strong>{slot.time}</strong><span>{slot.title}</span></li>
              ))}
            </ul>
          ) : <p className="empty-state">La grille des programmes n'est pas encore disponible.</p>}
          <Link href="/programme-tv" className="direct-cta">
            Consulter la grille complète <ChevronRight size={16} />
          </Link>
          <p className="photo-credit">Programmation susceptible d'être modifiée par la rédaction.</p>
        </div>
      </div>

      {stories.length > 0 && (
        <section className="editorial-section" aria-label="L'actualité à suivre">
          <div className="section-head has-rule"><h2>L'actualité à suivre</h2></div>
          <div className="selection-grid">
            {stories.map((story) => <StoryCard key={story.slug} story={story} />)}
          </div>
        </section>
      )}
    </main>
  );
}
