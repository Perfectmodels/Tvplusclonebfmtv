import Link from 'next/link';

export default function CategoryChips({
  items,
  active,
  basePath = '/rubrique',
}: {
  items: string[];
  active?: string;
  basePath?: string;
}) {
  return (
    <div className="rubrique-chips">
      <Link href={basePath === '/rubrique' ? '/news-24-7' : basePath} className={!active ? 'is-active' : ''}>
        Tout
      </Link>
      {items.map((item) => (
        <Link
          key={item}
          href={basePath + '/' + encodeURIComponent(item.toLowerCase())}
          className={active?.toLowerCase() === item.toLowerCase() ? 'is-active' : ''}
        >
          {item}
        </Link>
      ))}
    </div>
  );
}
