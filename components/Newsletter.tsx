import Link from 'next/link';

export default function Newsletter({
  title = 'Recevez votre Récap Actu',
  description = 'Inscrivez-vous pour être informé lors de la mise en service des envois de notre rédaction.',
  href = '/newsletters',
  label = 'Inscrivez-vous à la newsletter',
}: {
  title?: string;
  description?: string;
  href?: string;
  label?: string;
}) {
  return (
    <section className="newsletter" aria-label="Newsletter">
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <Link href={href} className="newsletter-btn">{label}</Link>
    </section>
  );
}
