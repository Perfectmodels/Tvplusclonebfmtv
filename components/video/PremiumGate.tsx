import Link from 'next/link';
import {LockKeyhole} from 'lucide-react';
export default function PremiumGate({authenticated,configured,entitled}:{authenticated:boolean;configured:boolean;entitled:boolean}){
 return <div className="tvplus-premium-gate"><LockKeyhole size={42}/><h2>TV+ Afrique Premium</h2><p>{!configured?'Le service d’abonnement au direct est en cours de préparation.':entitled?'Votre accès est actif, mais le lecteur sécurisé est temporairement indisponible.':'Le direct est réservé aux abonnés.'}</p>{!authenticated&&<Link href="/connexion?next=/direct">Se connecter</Link>}<Link href="/compte">Mon compte</Link><small>Aucun paiement n’est demandé tant que les offres et le prestataire ne sont pas activés.</small></div>;
}
