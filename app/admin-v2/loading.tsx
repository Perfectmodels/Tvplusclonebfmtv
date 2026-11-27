import {ListSkeleton} from '../../components/ui/FeedbackState';
export default function Loading(){return <main className="v2-newsroom-page" aria-busy="true"><header className="v2-newsroom-page-header"><h1>Chargement de votre espace</h1><p>Récupération des informations du serveur.</p></header><ListSkeleton rows={6}/></main>;}
