import Link from 'next/link';
import {ShieldCheck,Radio,Bookmark,LockKeyhole} from 'lucide-react';
import TvPlusLogo from '../TvPlusLogo';
import './auth-experience.css';
export default function AuthShell({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}){
 return <main className="auth-page tv-auth-experience"><div className="auth-panel"><Link href="/" className="auth-brand" aria-label="Accueil TV+ Afrique"><TvPlusLogo/></Link><div className="auth-panel-copy"><span className="auth-kicker">TV+ Afrique — Mon espace</span><h2>L’information vous accompagne.</h2><p>Retrouvez vos services TV+ Afrique au même endroit.</p><div className="tv-auth-benefits"><span><Radio size={21}/> Accédez au Direct Premium selon vos droits</span><span><Bookmark size={21}/> Retrouvez votre espace personnel</span><span><ShieldCheck size={21}/> Une connexion protégée</span></div></div><span className="auth-panel-footer">L’actualité du Gabon et de l’Afrique en continu.</span></div><div className="auth-content"><div className="auth-card"><h1>{title}</h1><p className="auth-subtitle">{subtitle}</p>{children}<div className="tv-auth-bottom"><LockKeyhole size={14}/> Connexion sécurisée · TV+ Afrique</div></div></div></main>;
}
