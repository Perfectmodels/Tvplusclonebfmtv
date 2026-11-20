import Link from 'next/link';
import { categorySlug } from '../lib/categories';

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
          href={basePath + '/' + encodeURIComponent(categorySlug(item))}
          className={(active ? categorySlug(active) === categorySlug(item) : false) ? 'is-active' : ''}
        >
          {item}
        </Link>
      ))}
    </div>
  );
}
