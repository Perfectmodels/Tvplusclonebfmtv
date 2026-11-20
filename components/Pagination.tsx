import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({
  page,
  totalPages,
  basePath,
  query,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  query?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;
  const href = (p: number) => {
    const params = new URLSearchParams();
    Object.entries(query ?? {}).forEach(([k, v]) => v && params.set(k, v));
    params.set('page', String(p));
    return `${basePath}?${params.toString()}`;
  };

  return (
    <nav className="pagination" aria-label="Pagination">
      {page > 1 ? (
        <Link href={href(page - 1)} className="page-arrow" aria-label="Page précédente">
          <ChevronLeft size={17} />
        </Link>
      ) : (
        <span className="page-arrow is-disabled" aria-hidden="true"><ChevronLeft size={17} /></span>
      )}
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <Link key={p} href={href(p)} className={'page-number' + (p === page ? ' is-current' : '')}>
          {p}
        </Link>
      ))}
      {page < totalPages ? (
        <Link href={href(page + 1)} className="page-arrow" aria-label="Page suivante">
          <ChevronRight size={17} />
        </Link>
      ) : (
        <span className="page-arrow is-disabled" aria-hidden="true"><ChevronRight size={17} /></span>
      )}
    </nav>
  );
}
