'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FileText, FolderTree, Images, Tv, Users, Settings,
  Menu, X, LogOut, ChevronLeft, ChevronRight, ExternalLink, Bell, Search, UserCircle,
  PlayCircle, Radio, MessageCircleQuestion,
} from 'lucide-react';
import TvPlusLogo from '../TvPlusLogo';

const NAV = [
  { href: '/admin', label: 'Vue générale', icon: LayoutDashboard },
  { href: '/admin/articles', label: 'Articles', icon: FileText },
  { href: '/admin/categories', label: 'Rubriques', icon: FolderTree },
  { href: '/admin/media', label: 'Médiathèque', icon: Images },
  { href: '/admin/programs', label: 'Émissions', icon: Tv },
  { href: '/admin/replays', label: 'Replays', icon: PlayCircle },
  { href: '/admin/live', label: 'Diffusion live', icon: Radio },
  { href: '/admin/questions', label: 'Questions', icon: MessageCircleQuestion },
  { href: '/admin/users', label: 'Utilisateurs', icon: Users },
  { href: '/admin/settings', label: 'Paramètres', icon: Settings },
];

type Notification = { label: string; count: number; href: string };

export default function AdminShell({
  title,
  userEmail,
  children,
}: {
  title: string;
  userEmail: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem('tvplus-admin-collapsed') === '1');
  }, []);

  useEffect(() => { setOpen(false); setShowNotifications(false); setShowProfile(false); }, [pathname]);

  useEffect(() => {
    fetch('/api/admin/notifications')
      .then((r) => r.json())
      .then((b) => setNotifications(b.data?.items ?? []))
      .catch(() => {});
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((v) => {
      localStorage.setItem('tvplus-admin-collapsed', v ? '0' : '1');
      return !v;
    });
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  const current = NAV.find((item) => item.href === pathname)
    ?? NAV.filter((item) => item.href !== '/admin').find((item) => pathname.startsWith(item.href + '/'));
  const activeLabel = current?.label ?? title;
  const totalNotifications = notifications.reduce((sum, n) => sum + n.count, 0);

  const nav = (
    <nav className="admin-nav" aria-label="Navigation administration">
      {NAV.map((item) => {
        const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href + '/'));
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={'admin-nav-link' + (active ? ' is-active' : '')}
            aria-current={active ? 'page' : undefined}
            title={collapsed ? item.label : undefined}
          >
            <Icon size={18} />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className={'admin-shell' + (collapsed ? ' is-collapsed' : '')}>
      {open && <button className="admin-backdrop" aria-label="Fermer le menu" onClick={() => setOpen(false)} />}

      <aside className={'admin-sidebar' + (open ? ' is-open' : '')}>
        <div className="admin-sidebar-head">
          <Link href="/" className="admin-brand" aria-label="TV Plus, accueil">
            <TvPlusLogo />
            <span>ADMIN</span>
          </Link>
          <button className="admin-icon-btn admin-close" aria-label="Fermer le menu" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>
        {nav}
        <div className="admin-sidebar-foot">
          <Link href="/" className="admin-nav-link"><ExternalLink size={16} /> {!collapsed && <span>Voir le site</span>}</Link>
          <button className="admin-icon-btn admin-collapse" onClick={toggleCollapsed} aria-label={collapsed ? 'Déployer la sidebar' : 'Réduire la sidebar'}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button className="admin-icon-btn admin-menu" aria-label="Ouvrir le menu" onClick={() => setOpen(true)}>
              <Menu size={20} />
            </button>
            <div>
              <span className="admin-breadcrumb">Administration / {activeLabel}</span>
              <h1>{activeLabel}</h1>
            </div>
          </div>
          <div className="admin-topbar-right">
            <form
              className="admin-top-search"
              onSubmit={(e) => {
                e.preventDefault();
                if (search.trim()) router.push(`/admin/articles?q=${encodeURIComponent(search.trim())}`);
              }}
            >
              <Search size={15} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" aria-label="Rechercher dans l’administration" />
            </form>

            <div className="admin-popover-wrap">
              <button
                type="button"
                className="admin-icon-btn"
                aria-label="Notifications"
                aria-expanded={showNotifications}
                onClick={() => { setShowNotifications((v) => !v); setShowProfile(false); }}
              >
                <Bell size={17} />
                {totalNotifications > 0 && <span className="admin-notif-dot">{totalNotifications}</span>}
              </button>
              {showNotifications && (
                <div className="admin-popover" role="dialog" aria-label="Notifications">
                  <strong>Notifications</strong>
                  {notifications.length === 0 ? (
                    <p className="admin-muted">Aucune notification.</p>
                  ) : notifications.map((n) => (
                    <Link href={n.href} key={n.label} onClick={() => setShowNotifications(false)}>
                      <span>{n.label}</span>
                      <b>{n.count}</b>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="admin-popover-wrap">
              <button
                type="button"
                className="admin-avatar-btn"
                aria-label="Menu du profil"
                aria-expanded={showProfile}
                onClick={() => { setShowProfile((v) => !v); setShowNotifications(false); }}
              >
                <UserCircle size={20} />
              </button>
              {showProfile && (
                <div className="admin-popover" role="dialog" aria-label="Profil">
                  <strong>{userEmail}</strong>
                  <Link href="/compte" onClick={() => setShowProfile(false)}>Mon compte</Link>
                  <Link href="/" onClick={() => setShowProfile(false)}>Voir le site</Link>
                  <button type="button" onClick={logout}><LogOut size={14} /> Déconnexion</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
