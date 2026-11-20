'use client';

import { AlertTriangle } from 'lucide-react';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onCancel}>
      <div className="admin-modal admin-modal-sm" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="admin-modal-head"><h2>{title}</h2></div>
        <div className="admin-modal-body">
          <p className="confirm-warning"><AlertTriangle size={18} /> {message}</p>
        </div>
        <div className="admin-modal-foot">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onCancel} disabled={loading}>Annuler</button>
          <button type="button" className="admin-btn admin-btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Traitement…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
