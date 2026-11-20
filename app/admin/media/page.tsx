'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import DataTable, { type Column } from '../../../components/admin/DataTable';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import { useToast } from '../../../components/admin/ToastProvider';

type Media = Record<string, any> & { id: string; file_name: string; public_url: string; mime_type: string; size_bytes: number; created_at: string };

export default function AdminMediaPage() {
  const [refresh, setRefresh] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<Media | null>(null);
  const [busy, setBusy] = useState(false);
  const { success, error } = useToast();

  async function upload() {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const response = await fetch('/api/admin/media', { method: 'POST', body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Téléversement impossible.');
      success('Média téléversé.'); setFile(null); setRefresh((r) => r + 1);
    } catch (err) { error(err instanceof Error ? err.message : 'Erreur.'); }
    finally { setUploading(false); }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/media/${deleting.id}`, { method: 'DELETE' });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Suppression impossible.');
      success('Média supprimé.'); setDeleting(null); setRefresh((r) => r + 1);
    } catch (err) { error(err instanceof Error ? err.message : 'Erreur.'); }
    finally { setBusy(false); }
  }

  async function copy(url: string) {
    try { await navigator.clipboard.writeText(url); success('URL copiée.'); }
    catch { error('Copie impossible.'); }
  }

  const columns: Column<Media>[] = [
    { key: 'preview', label: 'Aperçu', render: (row) => row.mime_type.startsWith('image/')
      ? <img className="admin-thumb" src={row.public_url} alt="" />
      : <span className="admin-muted">Vidéo</span> },
    { key: 'file_name', label: 'Fichier', render: (row) => <strong>{row.file_name}</strong> },
    { key: 'size_bytes', label: 'Taille', hideOnMobile: true, render: (row) => `${(row.size_bytes / 1024).toFixed(0)} Ko` },
    { key: 'created_at', label: 'Ajouté le', hideOnMobile: true, render: (row) => new Date(row.created_at).toLocaleDateString('fr-FR') },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div><h2>Médiathèque</h2><p>Téléversez et réutilisez les images et vidéos du site.</p></div>
      </div>

      <section className="admin-section admin-upload">
        <div className="admin-upload-row">
          <label className="admin-file-label">
            <Upload size={18} /> {file ? file.name : 'Choisir un fichier (JPG, PNG, WebP, GIF, MP4 — 20 Mo max)'}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <button type="button" className="admin-btn admin-btn-primary" onClick={upload} disabled={!file || uploading}>
            {uploading ? 'Envoi…' : 'Téléverser'}
          </button>
        </div>
      </section>

      <DataTable
        endpoint="/api/admin/media" columns={columns} rowKey={(r) => r.id} refreshKey={refresh}
        onDelete={setDeleting} searchPlaceholder="Rechercher un média…"
        extraActions={(row) => <button type="button" className="admin-link" onClick={() => copy(row.public_url)}>Copier l’URL</button>}
      />

      <ConfirmDialog open={!!deleting} title="Supprimer ce média ?" message="La suppression est refusée si le média est utilisé par un article." confirmLabel="Supprimer" loading={busy} onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </div>
  );
}
