import Link from 'next/link';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import PremiumCheckout from './PremiumCheckout';
import './premium-checkout.css';

export default function PremiumGate({ authenticated, entitled, offer, price }: {
  authenticated: boolean;
  entitled: boolean;
  offer?: string;
  price?: string;
}) {
  const next = '/direct' + (offer ? '?offre=' + encodeURIComponent(offer) : '');
  const authQuery = '?next=' + encodeURIComponent(next);

  return (
    <section className="direct-access" aria-labelledby="direct-access-title">
      {entitled ? (
        <>
          <h2 id="direct-access-title">Votre accès est actif</h2>
          <p>Votre accès est actif. Le lecteur sécurisé sera disponible dès sa configuration.</p>
        </>
      ) : (
        <>
          <h2 id="direct-access-title">{authenticated ? 'Choisissez votre accès' : 'Créez votre compte pour accéder au direct'}</h2>
          {authenticated ? <PremiumCheckout offer={offer} /> : (
            <>
              <p>Créez votre compte, choisissez votre accès{price ? ' à ' + price : ''} et réglez en ligne. Votre accès est activé dès la confirmation du paiement.</p>
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
