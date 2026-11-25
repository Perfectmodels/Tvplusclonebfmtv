import Link from 'next/link';
import Breadcrumb from '../../components/Breadcrumb';
import ScheduleBoard from '../../components/ScheduleBoard';
import { getPrograms, getTvSchedule } from '../../lib/db/repository';

export const revalidate = 60;

export default async function ProgrammeTvPage() {
  const [{ data: schedule }, { data: programs }] = await Promise.all([
    getTvSchedule(),
    getPrograms(),
  ]);

  return (
    <main className="shell listing-page">
      <Breadcrumb items={[{ label: 'Accueil', href: '/' }, { label: 'Grille des programmes' }]} />
      <h1 className="page-title">Programme TV</h1>
      <p className="page-intro">
        Consultez les horaires de diffusion des émissions TV+ Afrique.
        La programmation est indicative et peut évoluer.
      </p>
      <ScheduleBoard items={schedule} />
      <div className="section-head has-rule"><h2>Les émissions de la semaine</h2></div>
      <div className="program-strip">
        {programs.slice(0, 6).map((p) => (
          <div className="program-tile" key={p.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.image&&<img src={p.image} alt="" loading="lazy" />}
            {p.slug?<Link href={'/emissions/'+p.slug}>{p.name}</Link>:<span>{p.name}</span>}
            <small>{p.slot}</small>
          </div>
        ))}
      </div>
    </main>
  );
}
