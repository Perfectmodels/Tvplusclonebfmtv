import type { Metadata } from 'next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import SiteFrame from '../components/SiteFrame';
import { getCategories, getHeaderTopics } from '../lib/db/repository';
import './globals.css';
import './editorial.css';
import './replay-embeds.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tvplusv2.vercel.app'),
  applicationName: 'TV+ Afrique',
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
        <SiteFrame
          header={<Header categories={categories} topics={topics} />}
          footer={<Footer categories={categories} />}
        >
          {children}
        </SiteFrame>
      </body>
    </html>
  );
}
