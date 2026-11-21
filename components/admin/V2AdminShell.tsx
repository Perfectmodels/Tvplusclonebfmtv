'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Newspaper, Images, ListTree, Tv, PlayCircle, MonitorPlay,
  RectangleHorizontal, Menu, X, LogOut, ExternalLink, Plus, ChevronRight,
} from 'lucide-react';
import TvPlusLogo from '../TvPlusLogo';

const GROUPS=[
  { label:'Pilotage', links:[{href:'/admin-v2',label:'Vue générale',icon:LayoutDashboard,permission:''}] },
  { label:'Rédaction', links:[
    {href:'/admin-v2/articles',label:'Articles',icon:Newspaper,permission:'articles.read_all'},
    {href:'/admin-v2/media',label:'Médiathèque',icon:Images,permission:'media.upload'},
    {href:'/admin-v2/categories',label:'Rubriques',icon:ListTree,permission:'categories.manage'},
  ] },
  { label:'Diffusion', links:[
    {href:'/admin-v2/shows',label:'Émissions',icon:Tv,permission:'shows.manage'},
    {href:'/admin-v2/replays',label:'Replays',icon:PlayCircle,permission:'shows.manage'},
    {href:'/admin-v2/live',label:'Direct',icon:MonitorPlay,permission:'schedule.manage'},
    {href:'/admin-v2/advertising',label:'Publicités',icon:RectangleHorizontal,permission:'settings.manage'},
  ] },
];
const ROLES:Record<string,string>={
  super_admin:'Super administrateur',admin:'Administrateur',
  editor_in_chief:'Rédacteur en chef',journalist:'Journaliste',
  video_editor:'Monteur',community_manager:'Responsable numérique',
};
function currentPage(pathname:string) {
  if(pathname==='/admin-v2')return 'Vue générale';
  if(pathname==='/admin-v2/articles/new')return 'Nouvel article';
  if(pathname.includes('/articles/') && pathname.endsWith('/edit'))return 'Modifier un article';
  for(const group of GROUPS){
    for(const item of group.links){
      if(pathname===item.href || (item.href!=='/admin-v2' && pathname.startsWith(item.href+'/')))
        return item.label;
    }
  }
  return 'Administration';
}

export default function V2AdminShell({children,role,email,permissions}:{
  children:React.ReactNode;role:string;email:string;permissions:string[];
}) {
  const [open,setOpen]=useState(false);
  const pathname=usePathname();
  const router=useRouter();
  const logout=async()=>{
    await fetch('/api/auth/logout',{method:'POST',cache:'no-store'});
    router.replace('/connexion');router.refresh();
  };
  const roleLabel=ROLES[role]??'Collaborateur';
  return <div className="v2-shell v2-newsroom-shell">
    {open&&<button type="button" className="v2-backdrop"
      aria-label="Fermer la navigation" onClick={()=>setOpen(false)}/>}
    <aside className={'v2-sidebar'+(open?' is-open':'')}>
      <div className="v2-sidebar-head">
        <Link href="/" aria-label="TV+ Afrique"><TvPlusLogo/></Link>
        <button type="button" onClick={()=>setOpen(false)}
          aria-label="Fermer le menu" className="v2-mobile-close"><X size={20}/></button>
      </div>
      <p className="v2-sidebar-eyebrow">STUDIO & ADMINISTRATION</p>
      <nav aria-label="Navigation du tableau de bord" className="v2-navigation">
        {GROUPS.map(group=>{
          const links=group.links.filter(link=>!link.permission||permissions.includes(link.permission));
          return links.length?<div className="v2-nav-group" key={group.label}>
            <span className="v2-nav-section-label">{group.label}</span>
            {links.map(link=>{
              const Icon=link.icon;
              const active=pathname===link.href || (link.href!=='/admin-v2'&&pathname.startsWith(link.href+'/'));
              return <Link key={link.href} href={link.href} onClick={()=>setOpen(false)}
                aria-current={active?'page':undefined} className={'v2-nav-item'+(active?' is-active':'')}>
                <Icon size={19} strokeWidth={1.9}/><span>{link.label}</span>
                {active&&<ChevronRight className="v2-nav-current" size={15} aria-hidden="true"/>}
              </Link>;
            })}
          </div>:null;
        })}
      </nav>
      <div className="v2-sidebar-bottom">
        <div className="v2-sidebar-person"><span className="v2-sidebar-avatar" aria-hidden="true">{email.slice(0,2).toUpperCase()}</span>
          <span><strong>{roleLabel}</strong><small>{email}</small></span></div>
        <Link href="/" className="v2-nav-item" onClick={()=>setOpen(false)}>
          <ExternalLink size={17}/> Voir le site public</Link>
      </div>
    </aside>
    <div className="v2-main">
      <header className="v2-topbar">
        <div className="v2-topbar-main">
          <button type="button" className="v2-menu-button" onClick={()=>setOpen(true)}
            aria-label="Ouvrir la navigation"><Menu/></button>
          <div><span className="v2-topbar-eyebrow">Rédaction TV+ Afrique</span>
            <span className="v2-topbar-title">{currentPage(pathname)}</span></div>
        </div>
        <div className="v2-user">
          {permissions.includes('articles.create') && pathname!=='/admin-v2/articles/new' &&
            <Link href="/admin-v2/articles/new" className="v2-topbar-new-article">
              <Plus size={16}/> <span>Rédiger</span></Link>}
          <span className="v2-topbar-role" title={email}>{roleLabel}</span>
          <button type="button" className="v2-topbar-signout" onClick={logout}
            aria-label="Se déconnecter" title="Se déconnecter"><LogOut size={17}/></button>
        </div>
      </header>
      <main className="v2-content" id="admin-contenu">{children}</main>
    </div>
  </div>;
}
