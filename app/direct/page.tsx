import Link from 'next/link';
import { Check, ChevronRight, LockKeyhole, Radio } from 'lucide-react';
import Breadcrumb from '../../components/Breadcrumb';
import DirectLiveStage from '../../components/video/DirectLiveStage';
import PremiumGate from '../../components/video/PremiumGate';
import { getTvSchedule } from '../../lib/db/repository';
import { recipeActor,simulationMode } from '../../lib/payments/recipe-server';
import { premiumCatalog } from '../../lib/payments/catalog';
import { premiumAccess } from '../../lib/video/premium';
import './direct.css';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Direct Premium — TV+ Afrique', alternates: { canonical: '/direct' } };

const money = (amount: number) => amount.toLocaleString('fr-FR') + ' FCFA';

export default async function DirectPage({ searchParams }: { searchParams: Promise<{ offre?: string }> }) {
  const [access, scheduleResult, recipe, catalog, { offre }] = await Promise.all([
    premiumAccess(),
    getTvSchedule().catch(() => ({ data: [] })),
    recipeActor(),
    premiumCatalog().catch(() => ({ plans: [] })),
    searchParams,
  ]);
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Africa/Libreville' }).format(new Date());
  const today = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(weekday) + 1;
  const slots = scheduleResult.data
    .filter(slot => slot.weekday == null || slot.weekday === today || (today === 7 && slot.weekday === 0))
    .slice(0, 5);
  const offer = typeof offre === 'string' && /^[a-z0-9-]{1,50}$/.test(offre) ? offre : undefined;
  const plan = catalog.plans[0];
  const canWatch = access.entitled && access.configured;
  const simulation=simulationMode();

  return (
    <main className="shell direct-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Le direct' }]} />

      <header className="direct-hero">
        <div>
          <p className="direct-kicker"><Radio size={14} aria-hidden="true" /> TV+ AFRIQUE · CHAÎNE EN DIRECT</p>
          <h1 className="page-title">Le direct, sans attendre</h1>
          <p className="page-intro">
            Suivez les émissions et les grands rendez-vous de la chaîne. Un seul accès,
            {plan ? ' ' + money(plan.amount) + ' pour 24 heures' : ' à tarif unique'}, sans abonnement.
          </p>
          <div className="direct-hero-points">
            <span><Check size={15} aria-hidden="true" /> Accès immédiat après paiement</span>
            <span><Check size={15} aria-hidden="true" /> Valable 24 heures sur tous vos appareils</span>
            <span><LockKeyhole size={15} aria-hidden="true" /> Paiement en ligne sécurisé</span>
          </div>
        </div>
        <div className="direct-hero-badge" aria-hidden="true"><span /> EN DIRECT</div>
      </header>

      {simulation&&<section className="direct-access" aria-label="Mode simulation"><h2>Mode test du paiement</h2><p>Aucun débit réel pendant la recette. Les accès déjà achetés restent valables.</p>{recipe&&<Link className="premium-primary" href="/direct/recette">Tester le parcours de paiement</Link>}</section>}
      <div className="direct-watch-layout">
        <section className="direct-stage-panel" aria-label="Accès au direct">
          {canWatch ? <DirectLiveStage /> : (
            <PremiumGate
              authenticated={access.authenticated}
              entitled={access.entitled}
              offer={offer}
              price={plan ? money(plan.amount) : undefined}
            />
          )}
        </section>

        <aside className="direct-agenda" aria-labelledby="direct-schedule-title">
          <div className="direct-agenda-head">
            <h2 id="direct-schedule-title">Programme du jour</h2>
            <span>Heure de Libreville</span>
          </div>
          {slots.length ? (
            <ol>
              {slots.map(slot => (
                <li key={slot.time + slot.title}>
                  <time>{slot.time}</time>
                  <span>{slot.title}</span>
                </li>
              ))}
            </ol>
          ) : <p>Aucun horaire renseigné pour aujourd’hui.</p>}
          <Link href="/programme-tv">Voir toute la grille TV <ChevronRight size={16} aria-hidden="true" /></Link>
        </aside>
      </div>

      <section className="direct-journey" aria-labelledby="direct-journey-title">
        <h2 id="direct-journey-title">Comment accéder au live</h2>
        <ol>
          <li><span>01</span><strong>Créez votre compte</strong><p>Quelques informations suffisent, sans e-mail de confirmation.</p></li>
          <li><span>02</span><strong>Choisissez votre formule</strong><p>Un accès de 24 heures à {plan ? money(plan.amount) : 'tarif unique'}.</p></li>
          <li><span>03</span><strong>Réglez votre accès</strong><p>Paiement en ligne sécurisé, accès activé dès confirmation.</p></li>
          <li><span>04</span><strong>Regardez le direct</strong><p>Le lecteur s’ouvre sur cette page, sur tous vos appareils.</p></li>
        </ol>
      </section>

      {recipe && !simulation && <p className="direct-recipe"><Link href="/direct/recette">Ouvrir la simulation de paiement</Link></p>}
    </main>
  );
}
