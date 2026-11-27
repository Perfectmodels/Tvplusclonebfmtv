'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import PublicAssistant from './PublicAssistant';
import BackToTop from './BackToTop';
import LiveOverlayProvider from './video/LiveOverlayProvider';
import PodcastPlaybackProvider from './video/PodcastPlaybackProvider';

export default function SiteFrame({ children, header, footer }: {
  children: ReactNode;
  header: ReactNode;
  footer: ReactNode;
}) {
  const pathname = usePathname();
  const isDashboard = /^\/admin(?:-v2)?(?:\/|$)/.test(pathname);

  const isAuth = /^\/(connexion|inscription|mot-de-passe-oublie|reinitialiser-mot-de-passe)(\/|$)/.test(pathname);
  if(isAuth)return <><a href="#contenu" className="skip-link">Aller au formulaire</a><div id="contenu">{children}</div></>;
  if (isDashboard) {
    return (
      <>
        <a href="#contenu" className="skip-link">Aller au contenu du tableau de bord</a>
        <div id="contenu" tabIndex={-1}>{children}</div>
      </>
    );
  }

  return (
    <LiveOverlayProvider><PodcastPlaybackProvider>
      <a href="#contenu" className="skip-link">Aller au contenu</a>
      {header}
      <div id="contenu">{children}</div>
      {footer}
      <BackToTop />
      <PublicAssistant />
    </PodcastPlaybackProvider></LiveOverlayProvider>
  );
}
