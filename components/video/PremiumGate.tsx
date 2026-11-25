import {LockKeyhole} from 'lucide-react';
import PremiumCheckout from './PremiumCheckout';
import './premium-checkout.css';
export default function PremiumGate({authenticated,configured,entitled}:{authenticated:boolean;configured:boolean;entitled:boolean}){
 return <div className="tvplus-premium-gate"><LockKeyhole size={36}/><h2>TV+ Afrique Premium</h2><p>{entitled?'Votre accès est actif, mais le lecteur est temporairement indisponible.':'Choisissez une formule pour regarder le direct.'}</p>{!entitled&&<PremiumCheckout authenticated={authenticated} configured={configured}/>}</div>;
}