export default function EmptyState({
  title = 'Aucun résultat',
  description = 'Essayez une autre recherche ou explorez nos rubriques.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="empty-state-box">
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  );
}
