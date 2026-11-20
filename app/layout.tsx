import type { Metadata } from 'next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackToTop from '../components/BackToTop';
import LiveOverlayProvider from '../components/video/LiveOverlayProvider';
import { getCategories, getHeaderTopics } from '../lib/db/repository';
import { getProfile, getUser } from '../lib/auth/server';
import './globals.css';
import './editorial.css';

export const metadata: Metadata = {
  title: 'TV+ Afrique — L’actualité du Gabon en continu',
  description:
    'Actualités, décryptages, vidéos et direct au Gabon : politique, société, économie, sport et international sur TV+ Afrique.',
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  const [{ data: categories }, { data: topics }, user, profile] = await Promise.all([
    getCategories(),
    getHeaderTopics(),
    getUser(),
    getProfile(),
  ]);

  return (
    <html lang="fr">
      <body>
        <LiveOverlayProvider>
          <a href="#contenu" className="skip-link">Aller au contenu</a>
          <Header
            categories={categories}
            topics={topics}
            userEmail={user?.email ?? null}
            isAdmin={profile?.role === 'admin'}
          />
          <div id="contenu">{children}</div>
          <Footer categories={categories} />
          <BackToTop />
        </LiveOverlayProvider>
      </body>
    </html>
  );
}
