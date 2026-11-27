import type { Metadata } from 'next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import NotificationProvider from '../components/notifications/NotificationProvider';
import SiteFrame from '../components/SiteFrame';
import { getCategories } from '../lib/db/repository';
import { navigationCategories } from '../lib/public-navigation';
import './globals.css';
import './editorial.css';
import './replay-embeds.css';
import './home-refresh.css';
import './studio-public.css';
import './chatbot.css';
import '../components/ui/feedback.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tvplusclonebfmtv.vercel.app'),
  alternates:{types:{'application/rss+xml':'/rss.xml'}},
  applicationName: 'TV+ Afrique',
  openGraph: { siteName: 'TV+ Afrique', locale: 'fr_GA', type: 'website' },
  title: 'TV+ Afrique — L’actualité du Gabon en continu',
  description:
    'Actualités, décryptages, vidéos et direct au Gabon : politique, société, économie, sport et international sur TV+ Afrique.',
};

export default async function Layout({ children }: { children: React.ReactNode }) {
  const { data } = await getCategories().catch(() => ({ data: [] as string[] }));
  const categories = navigationCategories(data);
  const candidate=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const publicKey=candidate?.startsWith('sb_publishable_')?candidate:undefined;

  return (
    <html lang="fr">
      <body>
        <NotificationProvider url={process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL} publicKey={publicKey}>
        <SiteFrame
          header={<Header categories={categories} />}
          footer={<Footer categories={categories} />}
        >
          {children}
        </SiteFrame>
        </NotificationProvider>
      </body>
    </html>
  );
}
