'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ArrowUpDown, ChevronLeft, ChevronRight, Download, RefreshCw, Search } from 'lucide-react';
import { useToast } from './ToastProvider';

export type Column<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  hideOnMobile?: boolean;
};

export default function DataTable<T extends Record<string, any>>({
  endpoint,
  columns,
  rowKey,
  onEdit,
  onDelete,
  onBulkAction,
  extraActions,
  searchPlaceholder = 'Rechercher…',
  refreshKey = 0,
  bulkActions = [],
  exportable = false,
}: {
  endpoint: string;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onBulkAction?: (ids: string[], action: string) => void;
  extraActions?: (row: T) => ReactNode;
  searchPlaceholder?: string;
  refreshKey?: number;
  bulkActions?: { label: string; value: string }[];
  exportable?: boolean;
}) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [reload, setReload] = useState(0);
  const { error: toastError } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), q, sort, order });
      const response = await fetch(`${endpoint}?${params.toString()}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Chargement impossible.');
      setItems(body.data.items ?? []);
      setTotal(body.data.total ?? 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de chargement.';
      setError(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, pageSize, q, sort, order, reload, refreshKey, toastError]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [q, refreshKey]);

  function exportCsv() {
    const header = columns.map((c) => c.label).join(';');
    const lines = items.map((row) => columns.map((c) => {
      const value = row[c.key] ?? '';
      return `"${String(typeof value === 'object' ? JSON.stringify(value) : value).replace(/"/g, '""')}"`;
    }).join(';'));
    const blob = new Blob(['\ufeff' + [header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'export.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function toggleSort(key: string) {
    if (sort === key) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSort(key); setOrder('asc'); }
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="admin-table-wrap">
      <div className="admin-table-tools">
        <div className="admin-search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={searchPlaceholder} aria-label="Rechercher" />
        </div>
        <span className="admin-total">{total} élément{total > 1 ? 's' : ''}</span>
        {exportable && (
          <button type="button" className="admin-icon-btn" onClick={exportCsv} aria-label="Exporter en CSV" title="Exporter en CSV">
            <Download size={16} />
          </button>
        )}
        <button type="button" className="admin-icon-btn" onClick={() => setReload((r) => r + 1)} aria-label="Actualiser" title="Actualiser">
          <RefreshCw size={16} />
        </button>
      </div>

      {selected.length > 0 && (
        <div className="admin-bulk-bar">
          <span>{selected.length} sélectionné{selected.length > 1 ? 's' : ''}</span>
          {bulkActions.map((action) => (
            <button type="button" className="admin-btn admin-btn-ghost" key={action.value} onClick={() => onBulkAction?.(selected, action.value)}>
              {action.label}
            </button>
          ))}
          <button type="button" className="admin-link" onClick={() => setSelected([])}>Annuler</button>
        </div>
      )}

      {error && (
        <div className="admin-error" role="alert">
          <span>{error}</span>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={load}>Réessayer</button>
        </div>
      )}

      {loading ? (
        <div className="admin-skeleton" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => <span key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="admin-empty">Aucun élément à afficher.</div>
      ) : (
        <>
          <div className="admin-table-scroll">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="admin-check-col"><input type="checkbox" aria-label="Tout sélectionner" checked={items.length > 0 && selected.length === items.length} onChange={(e) => setSelected(e.target.checked ? items.map(rowKey) : [])} /></th>
                  {columns.map((column) => (
                    <th key={column.key}>
                      {column.sortable ? (
                        <button type="button" onClick={() => toggleSort(column.key)}>
                          {column.label} <ArrowUpDown size={13} />
                        </button>
                      ) : column.label}
                    </th>
                  ))}
                  {(onEdit || onDelete || extraActions) && <th className="admin-actions-col">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={rowKey(row)}>
                    <td className="admin-check-col"><input type="checkbox" aria-label={'Sélectionner ' + rowKey(row)} checked={selected.includes(rowKey(row))} onChange={(e) => setSelected(e.target.checked ? [...selected, rowKey(row)] : selected.filter((id) => id !== rowKey(row)))} /></td>
                    {columns.map((column) => (
                      <td key={column.key} data-label={column.label}>
                        {column.render ? column.render(row) : String(row[column.key] ?? '—')}
                      </td>
                    ))}
                    {(onEdit || onDelete || extraActions) && (
                      <td className="admin-actions-col">
                        {extraActions?.(row)}
                        {onEdit && <button type="button" className="admin-link" onClick={() => onEdit(row)}>Modifier</button>}
                        {onDelete && <button type="button" className="admin-link admin-link-danger" onClick={() => onDelete(row)}>Supprimer</button>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-mobile-list">
            {items.map((row) => (
              <article className="admin-mobile-card" key={rowKey(row)}>
                <label className="admin-mobile-select">
                  <input type="checkbox" checked={selected.includes(rowKey(row))} onChange={(e) => setSelected(e.target.checked ? [...selected, rowKey(row)] : selected.filter((id) => id !== rowKey(row)))} />
                  <span>Sélectionner</span>
                </label>
                {columns.filter((c) => !c.hideOnMobile).map((column) => (
                  <div className="admin-mobile-row" key={column.key}>
                    <span>{column.label}</span>
                    <div>{column.render ? column.render(row) : String(row[column.key] ?? '—')}</div>
                  </div>
                ))}
                {(onEdit || onDelete || extraActions) && (
                  <div className="admin-mobile-actions">
                    {extraActions?.(row)}
                    {onEdit && <button type="button" className="admin-btn admin-btn-ghost" onClick={() => onEdit(row)}>Modifier</button>}
                    {onDelete && <button type="button" className="admin-btn admin-btn-danger" onClick={() => onDelete(row)}>Supprimer</button>}
                  </div>
                )}
              </article>
            ))}
          </div>

          <div className="admin-pagination">
            <button type="button" className="admin-icon-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Page précédente"><ChevronLeft size={16} /></button>
            <span>Page {page} / {pages}</span>
            <button type="button" className="admin-icon-btn" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Page suivante"><ChevronRight size={16} /></button>
          </div>
        </>
      )}
    </div>
  );
}
