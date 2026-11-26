import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import Breadcrumb from '../../components/Breadcrumb';
import DirectLiveStage from '../../components/video/DirectLiveStage';
import PremiumGate from '../../components/video/PremiumGate';
import { getTvSchedule } from '../../lib/db/repository';
import { recipeActor } from '../../lib/payments/recipe-server';
import { premiumAccess } from '../../lib/video/premium';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Direct Premium — TV+ Afrique', alternates: { canonical: '/direct' } };

export default async function DirectPage({ searchParams }: { searchParams: Promise<{ offre?: string }> }) {
  const [access, { data: schedule }, recipe, { offre }] = await Promise.all([
    premiumAccess(),
    getTvSchedule().catch(() => ({ data: [] })),
    recipeActor(),
    searchParams,
  ]);
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Africa/Libreville' }).format(new Date());
  const today = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(weekday) + 1;
  const slots = schedule.filter(slot => slot.weekday == null || slot.weekday === today || (today === 7 && slot.weekday === 0)).slice(0, 5);
  const offer = typeof offre === 'string' && /^[a-z0-9-]{1,50}$/.test(offre) ? offre : undefined;

  return (
    <main className="shell direct-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Le direct' }]} />
      <header className="direct-intro">
        <h1 className="page-title">TV+ Afrique en direct</h1>
        <p className="page-intro">Suivez les émissions de la chaîne avec un accès acheté sur votre compte TV+ Afrique.</p>
      </header>

      <div className="direct-watch-layout">
        {access.entitled && access.configured ? <DirectLiveStage /> : (
          <PremiumGate authenticated={access.authenticated} entitled={access.entitled} offer={offer} />
        )}
        <aside className="direct-agenda" aria-labelledby="direct-schedule-title">
          <h2 id="direct-schedule-title">Programme du jour</h2>
          {slots.length ? (
            <ul>{slots.map(slot => (
              <li key={slot.time + slot.title}><strong>{slot.time}</strong><span>{slot.title}</span></li>
            ))}</ul>
          ) : <p>Aucun horaire renseigné pour aujourd’hui.</p>}
          <Link href="/programme-tv">Voir la grille TV <ChevronRight size={16} aria-hidden="true" /></Link>
        </aside>
      </div>

      {recipe && <p><Link href="/direct/recette">Ouvrir la simulation de paiement</Link></p>}
    </main>
  );
}
