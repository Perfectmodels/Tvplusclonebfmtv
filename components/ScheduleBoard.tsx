export type ScheduleItem = { time: string; title: string; category: string; live: boolean };

/** La base ne fournit pas de date de diffusion : ne pas inventer d'autres journées. */
export default function ScheduleBoard({ items }: { items: ScheduleItem[] }) {
  if (!items.length) return <p className="empty-state">Aucun horaire n'a encore été renseigné.</p>;

  return (
    <div className="schedule" aria-label="Grille des programmes TV Plus">
      {items.map((slot) => (
        <div className="schedule-row" key={slot.time + slot.title}>
          <span className="schedule-time">{slot.time}</span>
          <span className="schedule-body">
            <span className="fil-category">{slot.category}</span>
            <strong>{slot.title}</strong>
          </span>
        </div>
      ))}
    </div>
  );
}
