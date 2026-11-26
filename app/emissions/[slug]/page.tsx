import Link from 'next/link';
import { notFound } from 'next/navigation';
import Breadcrumb from '../../../components/Breadcrumb';
import ShowIntro from '../../../components/video/ShowIntro';
import ReplayCatalog from '../../../components/video/ReplayCatalog';
import { getPrograms } from '../../../lib/db/repository';

export const revalidate = 60;

export default async function EmissionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const [{ slug }, { page }, { data: programs }] = await Promise.all([params, searchParams, getPrograms()]);
  const program = programs.find((item) => item.slug === slug);
  if (!program) notFound();

  return (
    <main className="shell listing-page">
      <Breadcrumb items={[
        { label: 'Accueil', href: '/' },
        { label: 'Émissions', href: '/replay-emissions' },
        { label: program.name },
      ]} />
      <div className="editorial-page-intro">
        <span className="editorial-eyebrow">LES ÉMISSIONS TV+ AFRIQUE</span>
        <h1 className="page-title">{program.name}</h1>
        {program.description && <p className="page-intro">{program.description}</p>}
        <div className="program-detail-meta">
          {program.host && <span>Présentation : {program.host}</span>}
          {program.slot && <span>Programmation : {program.slot}</span>}
        </div>
      </div>
      <ShowIntro title={program.name} url={program.introVideoUrl} poster={program.image}/>
      <section className="editorial-section" aria-label="Épisodes de l'émission">
        <div className="section-head has-rule"><h2>Les épisodes</h2></div>
        <ReplayCatalog programs={[program]} show={program} page={page} path={'/emissions/' + encodeURIComponent(slug)} />
      </section>
      <p><Link href="/replay-emissions" className="direct-cta">Toutes les émissions TV+</Link></p>
    </main>
  );
}
