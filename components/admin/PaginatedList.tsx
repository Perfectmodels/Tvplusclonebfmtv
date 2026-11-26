'use client';

import { useState, type ReactNode } from 'react';

export default function PaginatedList<T>({ items, children, pageSize = 8 }: {
  items: readonly T[];
  children: (visible: readonly T[]) => ReactNode;
  pageSize?: number;
}) {
  const [requestedPage, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(requestedPage, pages);
  const start = (page - 1) * pageSize;
  return <>
    {children(items.slice(start, start + pageSize))}
    {pages > 1 && <nav className="v2-local-pagination" aria-label="Pagination des résultats">
      <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setPage(page - 1)} disabled={page === 1}>
        Précédent
      </button>
      <span aria-live="polite">Page {page} / {pages}</span>
      <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setPage(page + 1)} disabled={page === pages}>
        Suivant
      </button>
    </nav>}
  </>;
}
