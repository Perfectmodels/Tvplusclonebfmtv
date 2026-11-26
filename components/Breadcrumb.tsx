import Link from 'next/link';

export type Crumb = { label: string; href?: string };

export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumb" aria-label="Fil d’Ariane">
      {items.map((item, i) => (
        <span key={item.label + i}>
          {i > 0 && <span className="crumb-sep">/</span>}
          {item.href ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
        </span>
      ))}
    </nav>
  );
}
