import {Suspense} from 'react';
import PaymentReturn from '../../../components/video/PaymentReturn';
import '../../../components/video/premium-checkout.css';
export const dynamic='force-dynamic';
export const metadata={title:'Mes paiements Premium — TV+ Afrique',robots:{index:false,follow:false}};
export default function Page(){return <Suspense fallback={<main className="premium-return">Chargement…</main>}><PaymentReturn/></Suspense>;}
