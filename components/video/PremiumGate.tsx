import {Radio} from 'lucide-react';
import PremiumCheckout from './PremiumCheckout';
import './premium-checkout.css';
export default function PremiumGate({authenticated,configured,entitled}:{authenticated:boolean;configured:boolean;entitled:boolean}){
 return <div className="tvplus-premium-gate"><Radio size={36}/><h2>Abonnez-vous à TV+ Afrique Premium</h2><p>{entitled?'Votre accès est actif, mais le lecteur est temporairement indisponible.':'Choisissez votre formule, créez votre compte et retrouvez le direct après confirmation de votre paiement.'}</p>{!entitled&&<PremiumCheckout authenticated={authenticated} configured={configured}/>}</div>;
}