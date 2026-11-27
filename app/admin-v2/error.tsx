'use client';
import Link from 'next/link';
import {FeedbackState} from '../../components/ui/FeedbackState';
export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}){return <main className="v2-newsroom-page"><FeedbackState kind="error" title="Impossible de charger cet espace" message={'Le service est momentanément indisponible. Réessayez.'+(error.digest?' Référence : '+error.digest:'')} action={reset}><Link href="/admin-v2">Retour au tableau de bord</Link></FeedbackState></main>;}
