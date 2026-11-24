import Link from 'next/link';
import {ChevronRight, Layers3} from 'lucide-react';
import Breadcrumb from '../../components/Breadcrumb';
import {getCategories} from '../../lib/db/repository';
import {categoryHref} from '../../lib/categories';
export const revalidate=60;
export const metadata={title:'Toutes les rubriques — TV+ Afrique',description:'Toutes les rubriques de TV+ Afrique : consultez les derniers articles de chaque catégorie.'};
export default async function RubriquesPage(){
 const {data:categories}=await getCategories();
 return <main className="shell listing-page">
   <Breadcrumb items={[{label:'Accueil',href:'/'},{label:'Toutes les rubriques'}]}/>
   <h1 className="page-title">Toutes les rubriques</h1>
   <p className="page-intro">Choisissez une rubrique pour consulter ses articles, du plus récent au plus ancien.</p>
   {categories.length>0
   ? <nav className="rubriques-directory" aria-label="Liste des rubriques de TV+ Afrique">
       {categories.map(category=><Link className="rubriques-directory-card" href={categoryHref(category)} key={category}>
         <span className="rubriques-directory-icon" aria-hidden="true"><Layers3 size={21}/></span>
         <span className="rubriques-directory-label"><strong>{category}</strong><small>Consulter les articles</small></span>
         <ChevronRight size={19} aria-hidden="true"/>
       </Link>)}
     </nav>
   : <p className="empty-state">Aucune rubrique disponible pour le moment.</p>}
 </main>;
}
