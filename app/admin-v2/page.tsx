import Link from 'next/link';
import { requireV2Page } from '../../lib/auth/v2-admin';
import { createAuthClient } from '../../lib/auth/server';

export const dynamic='force-dynamic';

export default async function DashboardV2() {
  const actor=await requireV2Page();
  const db=await createAuthClient();
  const results=await Promise.allSettled([
    db.from('articles').select('id',{head:true,count:'exact'}).eq('status','published'),
    db.from('articles').select('id',{head:true,count:'exact'}).eq('status','draft'),
    db.from('articles').select('id',{head:true,count:'exact'}).eq('status','in_review'),
    db.from('articles').select('id',{head:true,count:'exact'}).eq('status','scheduled'),
    db.from('categories').select('id',{head:true,count:'exact'}),
    db.from('media').select('id',{head:true,count:'exact'}),
    db.from('articles').select('id,slug,title,status,updated_at').order('updated_at',{ascending:false}).limit(8),
  ]);
  const valid=(i:number)=>results[i].status==='fulfilled'?results[i].value:null;
  const cards=[
    {label:'Articles publiés',value:valid(0)?.count},
    {label:'Brouillons',value:valid(1)?.count},
    {label:'À valider',value:valid(2)?.count},
    {label:'Programmés',value:valid(3)?.count},
    {label:'Rubriques',value:valid(4)?.count},
    {label:'Images et médias',value:valid(5)?.count},
  ];
  const recent=valid(6)?.data??[];
  return <div>
    <div className="v2-head"><div><h1 className="v2-title">Tableau de bord</h1><p className="v2-lede">Bienvenue {actor.name}. Vue des contenus réellement enregistrés sur TV+ Afrique.</p></div>
      {actor.permissions.includes('articles.create')&&<Link className="admin-btn admin-btn-primary" href="/admin-v2/articles/new">Rédiger un article</Link>}
    </div>
    <div className="v2-stat-grid">{cards.map(card=><section className="v2-card" key={card.label}>
      <strong className="v2-stat-number">{card.value??'—'}</strong><span className="v2-stat-label">{card.label}</span>
    </section>)}</div>
    <section className="v2-card"><div className="v2-head"><div><h2 className="v2-panel-title">Dernières modifications</h2><p className="v2-lede">Données Supabase en temps réel lors du chargement</p></div><Link href="/admin-v2/articles" className="admin-btn admin-btn-ghost">Tous les articles</Link></div>
      {recent.length?<div className="v2-table-scroll"><table className="v2-table"><thead><tr><th>Article</th><th>Statut</th><th>Dernière modification</th></tr></thead><tbody>
      {recent.map(a=><tr key={a.id}><td><Link href={'/admin-v2/articles/'+a.id+'/edit'}>{a.title}</Link></td><td>{a.status}</td><td>{new Date(a.updated_at).toLocaleString('fr-FR',{timeZone:'Africa/Libreville'})}</td></tr>)}</tbody></table></div>:<p className="v2-note">Aucun article disponible pour ce rôle.</p>}
    </section>
  </div>;
}
