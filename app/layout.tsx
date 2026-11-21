import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BackToTop from '../components/BackToTop';
import LiveOverlayProvider from '../components/video/LiveOverlayProvider';
import { getCategories, getHeaderTopics } from '../lib/db/repository';
import { getProfile, getUser } from '../lib/auth/server';
import './globals.css';
import './editorial.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tvplusv2.vercel.app'),
  applicationName: 'TV+ Afrique',
  openGraph: { siteName: 'TV+ Afrique', locale: 'fr_GA', type: 'website' },
  title: 'TV+ Afrique — L’actualité du Gabon en continu',
  description:
    'Actualités, décryptages, vidéos et direct au Gabon : politique, société, économie, sport et international sur TV+ Afrique.',
};

async function getOptionalAccount() {
  // La majorité des visiteurs sont anonymes. Ne pas contacter Supabase Auth
  // et Profiles pour chaque consultation du site public.
  const cookieStore = await cookies();
  const hasAuthCookie = cookieStore.getAll().some(({ name }) => name.startsWith('sb-') && name.includes('-auth-token'));
  if (!hasAuthCookie) return { user: null, profile: null };
  const user = await getUser();
  return { user, profile: user ? await getProfile(user) : null };
}

export default async function Layout({ children }: { children: React.ReactNode }) {
  const [{ data: categories }, { data: topics }, account] = await Promise.all([
    getCategories().catch(() => ({ data: [] as string[] })),
    getHeaderTopics().catch(() => ({ data: [] as { label: string; link: string }[] })),
    getOptionalAccount().catch(() => ({ user: null, profile: null })),
  ]);

  return (
    <html lang="fr">
      <body>
        <LiveOverlayProvider>
          <a href="#contenu" className="skip-link">Aller au contenu</a>
          <Header
            categories={categories}
            topics={topics}
            userEmail={account.user?.email ?? null}
            isAdmin={Boolean(account.profile && ['admin','super_admin','editor_in_chief','journalist'].includes(account.profile.role))}
          />
          <div id="contenu">{children}</div>
          <Footer categories={categories} />
          <BackToTop />
        </LiveOverlayProvider>
      </body>
    </html>
  );
}
