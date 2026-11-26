'use client';

import { useEffect, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Image as ImageIcon, Upload, Crop as CropIcon, X } from 'lucide-react';
import { useToast } from '../admin/ToastProvider';

export type CoverValue = {
  url: string;
  mediaId: string | null;
  alt: string;
  credit: string;
  caption: string;
};

export default function CoverPicker({ value, onChange }: { value: CoverValue; onChange: (next: CoverValue) => void }) {
  const [library, setLibrary] = useState<{ id: string; public_url: string; file_name: string }[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [cropSource, setCropSource] = useState<{ id: string; url: string; name: string } | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [cropping, setCropping] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    if (!showLibrary) return;
    fetch('/api/admin/media')
      .then((r) => r.json())
      .then((b) => setLibrary((b.data?.items ?? []).filter((m: any) => m.mime_type?.startsWith('image/'))))
      .catch(() => {});
  }, [showLibrary]);

  async function upload(file: File) {
    const form = new FormData();
    form.append('file', file);
    try {
      const response = await fetch('/api/admin/media', { method: 'POST', body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Envoi impossible.');
      success('Image envoyée dans la médiathèque.');
      onChange({ ...value, url: body.data.public_url, mediaId: body.data.id });
    } catch (err) {
      error(err instanceof Error ? err.message : 'Erreur.');
    }
  }

  async function saveCrop() {
    if (!cropSource || !area) return;
    setCropping(true);
    try {
      const response = await fetch('/api/admin/media/crop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId: cropSource.id, crop: area, name: cropSource.name }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Recadrage impossible.');
      onChange({ ...value, url: body.data.public_url, mediaId: body.data.id });
      setCropSource(null);
      success('Image recadrée en 1200 × 630.');
    } catch (err) {
      error(err instanceof Error ? err.message : 'Erreur.');
    } finally {
      setCropping(false);
    }
  }

  return (
    <div className="cover-picker">
      <div className="cover-preview">
        {value.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value.url} alt={value.alt || 'Aperçu de la couverture'} />
        ) : (
          <div className="cover-placeholder"><ImageIcon size={26} /><span>Aucune image de couverture</span></div>
        )}
        <span className="cover-ratio">1200 × 630 · 1,91:1</span>
      </div>

      <div className="cover-actions">
        <label className="admin-btn admin-btn-ghost cover-upload">
          <Upload size={15} /> Importer
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
          }} />
        </label>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setShowLibrary((v) => !v)}>Médiathèque</button>
        {value.mediaId && (
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => {
            const media = library.find((m) => m.id === value.mediaId);
            setCropSource({
              id: value.mediaId!,
              url: media?.public_url ?? value.url,
              name: media?.file_name ?? 'couverture',
            });
            setCrop({ x: 0, y: 0 }); setZoom(1); setArea(null);
          }}><CropIcon size={15} /> Recadrer</button>
        )}
      </div>

      {showLibrary && (
        <div className="cover-library">
          {library.length === 0 ? <p className="admin-muted">Aucune image dans la médiathèque.</p> : library.map((m) => (
            <button type="button" key={m.id} onClick={() => { onChange({ ...value, url: m.public_url, mediaId: m.id }); setShowLibrary(false); }} title={m.file_name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.public_url} alt="" />
            </button>
          ))}
        </div>
      )}

      <div className="cover-fields">
        <label>
          <span>Texte alternatif <b>*</b></span>
          <input value={value.alt} onChange={(e) => onChange({ ...value, alt: e.target.value })} placeholder="Décrivez l’image" />
        </label>
        <label>
          <span>Crédit photo</span>
          <input value={value.credit} onChange={(e) => onChange({ ...value, credit: e.target.value })} placeholder="© Agence / Photographe" />
        </label>
        <label>
          <span>Légende</span>
          <input value={value.caption} onChange={(e) => onChange({ ...value, caption: e.target.value })} placeholder="Légende facultative" />
        </label>
      </div>

      {cropSource && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal admin-crop-modal" role="dialog" aria-modal="true" aria-label="Recadrer l’image">
            <div className="admin-modal-head">
              <h2>Recadrer l’image</h2>
              <button type="button" className="admin-icon-btn" onClick={() => setCropSource(null)} aria-label="Fermer"><X size={16} /></button>
            </div>
            <div className="crop-stage">
              <Cropper
                image={cropSource.url}
                crop={crop}
                zoom={zoom}
                aspect={1200 / 630}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_cropped, pixels) => setArea(pixels)}
              />
            </div>
            <div className="crop-controls">
              <label>Zoom</label>
              <input type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => { setCrop({ x: 0, y: 0 }); setZoom(1); }}>Réinitialiser</button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={saveCrop} disabled={cropping || !area}>
                {cropping ? 'Traitement…' : 'Appliquer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
