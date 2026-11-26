import Link from 'next/link';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import PremiumCheckout from './PremiumCheckout';
import './premium-checkout.css';

export default function PremiumGate({ authenticated, entitled, offer }: {
  authenticated: boolean;
  entitled: boolean;
  offer?: string;
}) {
  const next = '/direct' + (offer ? '?offre=' + encodeURIComponent(offer) : '');
  const authQuery = '?next=' + encodeURIComponent(next);

  return (
    <section className="direct-access" aria-labelledby="direct-access-title">
      {entitled ? (
        <>
          <h2 id="direct-access-title">Votre accès est actif</h2>
          <p>Le lecteur est temporairement indisponible. Rechargez la page pour réessayer.</p>
        </>
      ) : (
        <>
          <h2 id="direct-access-title">{authenticated ? 'Choisissez votre accès' : 'Créez votre compte pour accéder au direct'}</h2>
          {authenticated ? <PremiumCheckout offer={offer} /> : (
            <>
              <p>Confirmez votre adresse e-mail, choisissez votre formule et réglez via SingPay. Votre accès sera activé après confirmation du paiement.</p>
              <div className="direct-access-actions">
                <Link className="premium-primary" href={'/inscription' + authQuery}>Créer mon compte <ArrowRight size={18} aria-hidden="true" /></Link>
                <Link className="premium-secondary" href={'/connexion' + authQuery}>J’ai déjà un compte</Link>
              </div>
              <p className="direct-access-note"><LockKeyhole size={16} aria-hidden="true" /> Votre achat est rattaché à votre compte TV+ Afrique.</p>
            </>
          )}
        </>
      )}
    </section>
  );
}
