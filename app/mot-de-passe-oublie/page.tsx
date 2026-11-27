import AuthShell from '../../components/auth/AuthShell';
import ForgotForm from '../../components/auth/ForgotForm';
import Link from 'next/link';
import {safeReturnPath} from '../../lib/auth/return-path';
export const metadata={title:'Récupération du compte — TV+ Afrique',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{next?:string;confirmation?:string}>}){const q=await searchParams,next=safeReturnPath(q.next,'');return <AuthShell title="Mot de passe oublié" subtitle="Saisissez votre adresse e-mail pour recevoir un lien sécurisé."><ForgotForm returnTo={next} expired={q.confirmation==='failed'}/><p className="auth-switch"><Link href={'/connexion'+(next?'?next='+encodeURIComponent(next):'')}>Retour à la connexion</Link></p></AuthShell>;}
