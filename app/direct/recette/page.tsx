import {notFound,redirect} from 'next/navigation';
import {recipeEnabled,recipeActor} from '../../../lib/payments/recipe-server';
import PremiumRecipe from '../../../components/video/PremiumRecipe';
import '../../../components/video/premium-checkout.css';
import './recette.css';
export const dynamic='force-dynamic';
export const metadata={title:'Recette paiement Premium — TV+ Afrique',robots:{index:false,follow:false}};
export default async function Page(){if(!recipeEnabled())notFound();if(!await recipeActor())redirect('/connexion?next=/direct/recette');return <PremiumRecipe/>;}
