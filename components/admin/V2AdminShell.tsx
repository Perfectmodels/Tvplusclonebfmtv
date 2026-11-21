'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Newspaper, Images, ListTree, Tv, MonitorPlay, RectangleHorizontal, Menu, X, LogOut, ExternalLink } from 'lucide-react';
import TvPlusLogo from '../TvPlusLogo';

const NAV = [
  {href:'/admin-v2', label:'Vue générale', icon:LayoutDashboard},
  {href:'/admin-v2/articles', label:'Articles', icon:Newspaper},
  {href:'/admin-v2/media', label:'Médiathèque', icon:Images},
  {href:'/admin-v2/categories', label:'Rubriques', icon:ListTree},
  {href:'/admin-v2/shows', label:'Émissions', icon:Tv},
  {href:'/admin-v2/live', label:'Direct', icon:MonitorPlay},
  {href:'/admin-v2/advertising', label:'Publicités', icon:RectangleHorizontal},
];

export default function V2AdminShell({children, role, email, permissions}:{children:React.ReactNode;role:string;email:string;permissions:string[]}) {
  const [open,setOpen]=useState(false);
  const pathname=usePathname();
  const router=useRouter();
  const visible=NAV.filter(x=>{
    if(x.href==='/admin-v2')return true;
    if(x.href.endsWith('/articles'))return permissions.includes('articles.read_all');
    if(x.href.endsWith('/media'))return permissions.includes('media.upload');
    if(x.href.endsWith('/categories'))return permissions.includes('categories.manage');
    if(x.href.endsWith('/shows'))return permissions.includes('shows.manage');
    if(x.href.endsWith('/live'))return permissions.includes('schedule.manage');
    if(x.href.endsWith('/advertising'))return permissions.includes('settings.manage');
    return false;
  });
  const logout=async()=>{
    await fetch('/api/auth/logout',{method:'POST',cache:'no-store'});
    router.replace('/connexion');router.refresh();
  };
  return <div className="v2-shell">
    {open&&<button type="button" className="v2-backdrop" aria-label="Fermer la navigation" onClick={()=>setOpen(false)}/>}
    <aside className={'v2-sidebar'+(open?' is-open':'')}>
      <div className="v2-sidebar-head"><Link href="/" aria-label="TV+ Afrique"><TvPlusLogo/></Link><button type="button" onClick={()=>setOpen(false)} aria-label="Fermer" className="v2-mobile-close"><X size={20}/></button></div>
      <p className="v2-sidebar-eyebrow">Administration TV+ Afrique</p>
      <nav aria-label="Navigation du tableau de bord" className="v2-navigation">
        {visible.map(link=>{const Icon=link.icon;const active=pathname===link.href||(link.href!=='/admin-v2'&&pathname.startsWith(link.href+'/'));return <Link key={link.href} href={link.href} onClick={()=>setOpen(false)} aria-current={active?'page':undefined} className={'v2-nav-item'+(active?' is-active':'')}><Icon size={19}/><span>{link.label}</span></Link>})}
      </nav>
      <div className="v2-sidebar-bottom"><Link href="/" className="v2-nav-item"><ExternalLink size={17}/> Voir le site public</Link></div>
    </aside>
    <div className="v2-main">
      <header className="v2-topbar"><button type="button" className="v2-menu-button" onClick={()=>setOpen(true)} aria-label="Ouvrir le menu"><Menu/></button><span className="v2-topbar-title">Espace rédaction et administration</span><div className="v2-user"><span title={role}>{email}</span><button type="button" className="admin-btn admin-btn-ghost" onClick={logout} aria-label="Se déconnecter"><LogOut size={16}/> <span>Quitter</span></button></div></header>
      <main className="v2-content" id="admin-contenu">{children}</main>
    </div>
  </div>
}
