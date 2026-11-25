import type { Metadata } from 'next';
import { canonicalSiteUrl } from '../lib/articles/site-url';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackToTop from '../components/BackToTop';
import LiveOverlayProvider from '../components/video/LiveOverlayProvider';
import { getCategories, getHeaderTopics } from '../lib/db/repository';
import './globals.css';
import './editorial.css';
import './replay-embeds.css';

export const metadata: Metadata = {
  metadataBase: new URL(canonicalSiteUrl()),
  applicationName: 'TV+ Afrique',
  alternates: { types: { 'application/rss+xml': '/rss.xml' } },
  openGraph: { siteName: 'TV+ Afrique', locale: 'fr_GA', type: 'website' },
  title: 'TV+ Afrique — L’actualité du Gabon en continu',
  description:
    'Actualités, décryptages, vidéos et direct au Gabon : politique, société, économie, sport et international sur TV+ Afrique.',
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  const [{ data: categories }, { data: topics }] = await Promise.all([
    getCategories().catch(() => ({ data: [] as string[] })),
    getHeaderTopics().catch(() => ({ data: [] as { label: string; link: string }[] })),
  ]);

  return (
    <html lang="fr">
      <body>
        <LiveOverlayProvider>
          <a href="#contenu" className="skip-link">Aller au contenu</a>
          <Header
            categories={categories}
            topics={topics}
          />
          <div id="contenu">{children}</div>
          <Footer categories={categories} />
          <BackToTop />
        </LiveOverlayProvider>
      </body>
    </html>
  );
}
