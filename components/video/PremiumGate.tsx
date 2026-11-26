import {Radio} from 'lucide-react';
import PremiumCheckout from './PremiumCheckout';
import './premium-checkout.css';
export default function PremiumGate({authenticated,configured,entitled}:{authenticated:boolean;configured:boolean;entitled:boolean}){
 return <div className="tvplus-premium-gate"><Radio size={36}/><h2>Votre accès au direct TV+ Afrique</h2><p>{entitled?'Votre accès est actif, mais le lecteur est temporairement indisponible.':'Choisissez votre formule et retrouvez le direct après confirmation de votre paiement. Les replays et les articles restent gratuits.'}</p>{!entitled&&<PremiumCheckout authenticated={authenticated} configured={configured}/>}</div>;
}