'use client';

import { useState } from 'react';
import { Copy } from 'lucide-react';
import { useToast } from '../admin/ToastProvider';

export default function SeoPanel({
  seoTitle,
  onSeoTitleChange,
  robots,
  onRobotsChange,
  title,
  chapter,
  siteUrl,
  shortId,
}: {
  seoTitle: string;
  onSeoTitleChange: (value: string) => void;
  robots: string;
  onRobotsChange: (value: string) => void;
  title: string;
  chapter: string;
  siteUrl: string;
  shortId?: string;
}) {
  const [copied, setCopied] = useState(false);
  const { success } = useToast();
  const publicUrl = `${siteUrl}${shortId ? `/a/${shortId}` : '/a/…'}`;
  const seoLength = seoTitle.length;

  async function copy() {
    if (!shortId) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      success('Lien court copié.');
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  return (
    <div className="seo-panel">
      <label>
        <span>Titre SEO <small>{seoLength}/60</small></span>
        <input value={seoTitle} onChange={(e) => onSeoTitleChange(e.target.value)} placeholder={title || 'Titre pour les moteurs de recherche'} />
        {seoLength > 0 && (seoLength < 50 || seoLength > 60) && <small className="seo-hint">Recommandé : 50 à 60 caractères</small>}
      </label>

      <button type="button" className="admin-link" onClick={() => onSeoTitleChange(title.slice(0, 60))}>
        Générer depuis le titre
      </button>

      <div className="seo-short-url">
        <span>URL publique courte (définitive)</span>
        <div className="seo-url">{publicUrl}</div>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={copy} disabled={!shortId}>
          <Copy size={14} /> {copied ? 'Copié' : 'Copier le lien court'}
        </button>
      </div>

      <label>
        <span>Indexation</span>
        <select value={robots} onChange={(e) => onRobotsChange(e.target.value)}>
          <option value="index,follow">index, follow</option>
          <option value="noindex,follow">noindex, follow</option>
          <option value="noindex,nofollow">noindex, nofollow</option>
        </select>
      </label>

      <div className="seo-preview">
        <h4>Aperçu Google</h4>
        <div className="seo-google-card">
          <span className="seo-google-url">{siteUrl} › a › {shortId || 'shortId'}</span>
          <strong>{seoTitle || title || 'Titre de l’article'}</strong>
          <p>{chapter || 'Ajoutez un chapô pour améliorer cet aperçu.'}</p>
        </div>
        <h4>Aperçu de partage</h4>
        <div className="seo-social-card">
          <div className="seo-social-image">1200 × 630</div>
          <div>
            <span>TV PLUS</span>
            <strong>{seoTitle || title || 'Titre de l’article'}</strong>
            <small>{chapter || 'Description de l’article'}</small>
          </div>
        </div>
      </div>
    </div>
  );
}
