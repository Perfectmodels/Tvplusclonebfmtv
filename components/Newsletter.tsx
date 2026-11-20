import Link from 'next/link';

export default function Newsletter({
  title = 'Recevez votre Récap Actu',
  description = 'Chaque soir, les informations essentielles de la journée dans votre boîte mail.',
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
