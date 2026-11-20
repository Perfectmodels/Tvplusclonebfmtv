import Link from 'next/link';
import { ChevronRight, Play } from 'lucide-react';
import Breadcrumb from '../../components/Breadcrumb';
import { getChannels, listArticles } from '../../lib/db/repository';
import { articlePath } from '../../lib/articles/urls';

export const revalidate = 60;

export default async function DirectPage() {
  const [{ data: channels }, { items: stories }] = await Promise.all([
    getChannels(),
    listArticles({ pageSize: 4 }),
  ]);

  return (
    <main className="shell direct-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Le direct' }]} />
      <h1 className="page-title">Le direct</h1>
      <p className="page-intro">
        Suivez l’antenne TV Plus en continu et retrouvez tous nos canaux de diffusion.
      </p>

      <div className="direct-main-player">
        <div className="direct-player-large" data-open-live>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="direct-player-image"
            src="https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1600&q=85&fit=crop"
            alt=""
          />
          <span className="direct-player-badge"><span /> Direct</span>
          <span className="play-button"><Play size={32} fill="currentColor" /></span>
        </div>
        <div className="direct-schedule">
          <h2>En ce moment à l’antenne</h2>
          <ul>
            <li><strong>06h00 – 09h00</strong><span>Première édition</span></li>
            <li><strong>09h00 – 12h00</strong><span>Le fil info</span></li>
            <li><strong>12h00 – 14h00</strong><span>Édition de la mi-journée</span></li>
            <li className="is-live"><strong>14h00 – 18h00</strong><span>TV Plus Non-stop</span></li>
            <li><strong>18h00 – 20h00</strong><span>Le décryptage</span></li>
          </ul>
          <p className="photo-credit">Grille indicative · Programmation susceptible de changer.</p>
        </div>
      </div>

      <div className="section-head has-rule"><h2>Tous les directs TV Plus</h2></div>
      <div className="direct-page-grid">
        {channels.map((channel) => (
          <Link href="/direct" className="channel-card" key={channel.name} data-open-live>
            <span className="channel-card-image">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={channel.image} alt="" loading="lazy" />
              <span className="channel-card-badge">Direct</span>
            </span>
            <span className="channel-card-body">
              <strong>{channel.name}</strong>
              <span>{channel.tagline}</span>
            </span>
          </Link>
        ))}
      </div>

      <div className="section-head has-rule">
        <h2>À suivre aussi</h2>
        <Link href="/news-24-7" className="section-more">Le fil info <ChevronRight size={15} /></Link>
      </div>
      <div className="selection-grid">
        {stories.map((story) => (
          <Link href={articlePath(story)} className="card-list" key={story.slug}>
            <span className="category-label">{story.category}</span>
            <span className="card-list-title">{story.title}</span>
            <span className="card-time">{story.time}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
