import { redirect } from 'next/navigation';
import { getV2Actor } from '../../../lib/auth/v2-admin';
import { sproutPermissions } from '../../../lib/video/sproutvideo-types';
import SproutVideoLibrary from '../../../components/admin/SproutVideoLibrary';
import '../studio/studio.css';

export const metadata = {
  title: 'Vidéothèque — Administration TV+ Afrique',
  robots: { index: false, follow: false },
};

export default async function VideosLibraryPage() {
  const actor = await getV2Actor();
  if (!actor) redirect('/connexion?next=/admin-v2/videos');
  if (!sproutPermissions().some(permission => actor.permissions.includes(permission))) redirect('/acces-refuse');

  return <div className="studio-shell">
    <header className="studio-head">
      <div>
        <p className="studio-kicker">STUDIO AUDIOVISUEL · SPROUTVIDEO</p>
        <h1>Vidéothèque</h1>
        <p>Téléversez, renommez et gérez les vidéos hébergées sur SproutVideo, sans quitter le tableau de bord.</p>
      </div>
    </header>
    <section className="studio-panel">
      <SproutVideoLibrary />
    </section>
  </div>;
}
