import Link from 'next/link';
import { ArrowRight, LockKeyhole, Radio, Tv } from 'lucide-react';

export default function HomePremiumCard(){
 return <section className="tvplus-home-premium" aria-labelledby="home-premium-title">
  <div className="tvplus-home-premium-top"><span><Tv size={18} aria-hidden="true"/> TV+ AFRIQUE</span><span className="tvplus-home-premium-tag"><LockKeyhole size={13} aria-hidden="true"/> PREMIUM</span></div>
  <div className="tvplus-home-premium-visual" aria-hidden="true"><Radio size={40}/><span>DIRECT</span></div>
  <h2 id="home-premium-title">Retrouvez TV+ Afrique en direct</h2>
  <p>Un espace réservé aux abonnés pour suivre les émissions et l’actualité de la chaîne.</p>
  <Link href="/direct" className="tvplus-home-premium-link">Accéder au Direct Premium <ArrowRight size={18} aria-hidden="true"/></Link>
 </section>;
}
