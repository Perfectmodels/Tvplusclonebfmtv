import Breadcrumb from '../../components/Breadcrumb';
import { getChannels } from '../../lib/db/repository';

export const revalidate = 60;

export default async function CanauxTvPage() {
  const { data: channels } = await getChannels();

  return (
    <main className="shell listing-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Canaux TV' }]} />
      <h1 className="page-title">Canaux TV</h1>
      <p className="page-intro">
        Toutes les chaînes du groupe TV Plus : information, économie, sport et culture.
      </p>
      <div className="channel-grid">
        {channels.map((channel) => (
          <article className="channel-card" key={channel.name}>
            <span className="channel-card-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={channel.image} alt="" loading="lazy" />
              <span className="channel-card-badge">{channel.kind}</span>
            </span>
            <span className="channel-card-body">
              <strong>{channel.name}</strong>
              <span>{channel.tagline}</span>
            </span>
          </article>
        ))}
      </div>
    </main>
  );
}
