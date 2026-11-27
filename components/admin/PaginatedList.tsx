'use client';

import {ChevronLeft,ChevronRight} from 'lucide-react';
import { useState, type ReactNode } from 'react';

export default function PaginatedList<T>({ items, children, pageSize = 8 }: {
  items: readonly T[];
  children: (visible: readonly T[]) => ReactNode;
  pageSize?: number;
}) {
  const [requestedPage, setPage] = useState(1);
  const size=Math.max(1,Math.floor(pageSize)||8);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const page = Math.min(requestedPage, pages);
  const start = (page - 1) * size;
  return <>
    {children(items.slice(start, start + size))}
    {pages > 1 && <nav className="v2-local-pagination" aria-label="Pagination des résultats">
      <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setPage(page - 1)} disabled={page === 1}>
        <ChevronLeft size={16}/> Précédent
      </button>
      <span aria-live="polite">{start+1}–{Math.min(start+size,items.length)} sur {items.length} · Page {page}/{pages}</span>
      <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setPage(page + 1)} disabled={page === pages}>
        Suivant <ChevronRight size={16}/>
      </button>
    </nav>}
  </>;
}
