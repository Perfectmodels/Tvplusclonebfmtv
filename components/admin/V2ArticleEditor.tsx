'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, ArrowUpRight, Archive, CalendarClock, Check, CheckCircle2, Circle, Copy, Eye, FileText,
  Globe2, ImagePlus, Image as ImageIcon, Link2, Save, Send, ShieldCheck,
  RotateCcw, ToggleLeft, ToggleRight, X,
} from 'lucide-react';
import TiptapEditor, { type EditorValue } from '../editor/TiptapEditor';
import { COUNTRIES, GABON_PROVINCES } from '../../lib/editor/countries';
import { parseVideoUrl } from '../../lib/video/providers';
import ReplayEmbed from '../video/ReplayEmbed';

type Category = { id: string; name: string; slug: string };
type Media = { id: string; url: string; alt: string; mime_type: string };
type ArticleForm = {
  title: string; slug: string; excerpt: string; category_id: string;
  cover_media_id: string | null; seo_title: string; seo_description: string;
  country_code: string; province_slug: string; featured: boolean; is_alert: boolean; video_url: string;
};
const initialForm: ArticleForm = {
  title: '', slug: '', excerpt: '', category_id: '', cover_media_id: null,
  seo_title: '', seo_description: '', country_code: 'GA', province_slug: '',
  featured: false, is_alert: false, video_url: '',
};
const emptyDoc = { type: 'doc', content: [{ type: 'paragraph' }] };
const statuses: Record<string, string> = {
  draft: 'Brouillon', in_review: 'À valider', approved: 'Validé',
  scheduled: 'Programmé', published: 'En ligne', inactive: 'Hors ligne', archived: 'Archivé',
};
const MAX_IMAGE_BYTES = 1024 * 1024;
function slugify(value: string) {
  return value.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '').slice(0, 120);
}
function parseKeywords(value: string) {
  return Array.from(new Set(value.split(',').map(item => item.trim()).filter(Boolean)));
}
function extractArticleText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const item = node as { text?: unknown; content?: unknown[] };
  if (typeof item.text === 'string') return item.text;
  return Array.isArray(item.content) ? item.content.map(extractArticleText).filter(Boolean).join(' ') : '';
}

export default function V2ArticleEditor({
  id, actorId, canReview,
}: { id?: string; actorId: string; canReview: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<ArticleForm>(initialForm);
  const [keywords, setKeywords] = useState('');
  const [content, setContent] = useState<EditorValue>({ json: emptyDoc, text: '', words: 0 });
  const [initialJson, setInitialJson] = useState<unknown>(emptyDoc);
  const [categories, setCategories] = useState<Category[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [loaded, setLoaded] = useState(!id);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [status, setStatus] = useState('draft');
  const [updatedAt, setUpdatedAt] = useState('');
  const [ownerId, setOwnerId] = useState(actorId);
  const [shortCode, setShortCode] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [mediaPage, setMediaPage] = useState(1);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleLocal, setScheduleLocal] = useState(()=>new Date(Date.now()+2*60*60_000).toISOString().slice(0,16));
  const [publicationDate, setPublicationDate] = useState<string|null>(null);

  const canEdit = canReview || (ownerId === actorId && ['draft', 'in_review'].includes(status));
  const cover = useMemo(() => media.find(item => item.id === form.cover_media_id), [media, form.cover_media_id]);
  const chosenMedia = useMemo(() => media.slice(0, mediaPage * 18), [media, mediaPage]);
  const tagCount = parseKeywords(keywords).length;
  const detectedVideo = parseVideoUrl(form.video_url);
  const validVideo = detectedVideo && ['youtube','facebook'].includes(detectedVideo.platform) ? detectedVideo : null;
  const categoryName = categories.find(category => category.id === form.category_id)?.name ?? 'Rubrique non définie';
  const countryName = COUNTRIES.find(country => country.code === form.country_code)?.name ?? form.country_code;
  const articleLink = shortCode ? '/a/' + shortCode : null;
  const checks = [
    { label: 'Titre de l’article', valid: form.title.trim().length >= 5 },
    { label: 'Chapeau renseigné', valid: form.excerpt.trim().length >= 20 },
    { label: 'Rubrique et pays', valid: Boolean(form.category_id && form.country_code) },
    { label: 'Contenu rédigé', valid: content.words > 0 },
    { label: 'Photo de couverture', valid: Boolean(form.cover_media_id) },
    { label: 'Mots-clés saisis', valid: tagCount > 0 },
  ];
  const completeCount = checks.filter(check => check.valid).length;

  const setField = <K extends keyof ArticleForm>(key: K, value: ArticleForm[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    setDirty(true);
    setSuccess('');
  };

  useEffect(() => {
    let alive = true;
    // Une indisponibilité de la médiathèque ne doit jamais masquer les rubriques.
    fetch('/api/admin-v2/categories', { cache: 'no-store' }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? 'Rubriques indisponibles');
      return result.data.items as Category[];
    }).then(items => { if (alive) setCategories(items); })
      .catch(e => { if (alive) setError(e.message); });

    fetch('/api/admin-v2/media?pageSize=60', { cache: 'no-store' }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? 'Médiathèque indisponible');
      return result.data.items as Media[];
    }).then(items => { if (alive) setMedia(items); })
      .catch(e => { if (alive) setError(e.message); });

    if (id) {
      fetch('/api/admin-v2/articles/' + id, { cache: 'no-store' }).then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message ?? 'Article inaccessible');
        return result.data;
      }).then(article => {
        if (!alive) return;
        setForm({
          title: article.title, slug: article.slug, excerpt: article.excerpt ?? '',
          category_id: article.category_id, cover_media_id: article.cover_media_id,
          seo_title: article.seo_title ?? '', seo_description: article.seo_description ?? '',
          country_code: article.country_code ?? 'GA', province_slug: article.province_slug ?? '',
          featured: Boolean(article.featured), is_alert: Boolean(article.is_alert),
          video_url: typeof article.content_json?.tvplusVideoUrl === 'string' ? article.content_json.tvplusVideoUrl : '',
        });
        setKeywords((article.tags ?? []).join(', '));
        // La couverture existante peut ne plus figurer parmi les 60 médias récents.
        if (article.cover_media_id) {
          fetch('/api/admin-v2/media?id=' + encodeURIComponent(article.cover_media_id), {cache:'no-store'})
            .then(r=>r.json()).then(result=>{
              const item=result.data?.items?.[0] as Media | undefined;
              if(item && alive) setMedia(current => current.some(m=>m.id===item.id)?current:[item,...current]);
            }).catch(()=>{});
        }
        setInitialJson(article.content_json ?? emptyDoc);
        const initialText = extractArticleText(article.content_json ?? emptyDoc);
        setContent({
          json: article.content_json ?? emptyDoc,
          text: initialText,
          words: initialText.trim() ? initialText.trim().split(/\s+/).length : 0,
        });
        setStatus(article.status);
        setShortCode(article.short_code ?? null);
        setPublicationDate(article.published_at ?? null);
        setOwnerId(article.author_id);
        setUpdatedAt(article.updated_at);
        setDirty(false);
        setLoaded(true);
      }).catch(e => { if (alive) { setError(e.message); setLoaded(true); } });
    }
    return () => { alive = false; };
  }, [id]);

  const save = useCallback(async (): Promise<{ id: string; slug: string; updated_at: string } | null> => {
    if (!canEdit) { setError('Vous ne pouvez pas modifier cet article.'); return null; }
    if (!form.title.trim() || !form.excerpt.trim() || !form.slug.trim() || !form.category_id || !form.country_code) {
      setError('Le titre, le chapeau, la rubrique et le pays sont obligatoires.'); return null;
    }
    const detected = parseVideoUrl(form.video_url);
    if (form.video_url.trim() && (!detected || !['youtube','facebook'].includes(detected.platform))) { setError('Collez une URL publique de reportage YouTube ou Facebook valide.'); return null; }
    const tags = parseKeywords(keywords);
    if (tags.length > 20 || tags.some(tag => tag.length > 65)) {
      setError('Indiquez au maximum 20 mots-clés de 65 caractères chacun.'); return null;
    }
    if (!content.json || typeof content.json !== 'object') {
      setError('Le contenu de l’article est invalide.'); return null;
    }
    setSaving(true); setError(''); setSuccess('');
    try {
      const body = {
        ...form, tags, cover_media_id: form.cover_media_id || null,
        province_slug: form.country_code === 'GA' ? form.province_slug || null : null,
        seo_title: form.seo_title || null, seo_description: form.seo_description || null,
        content_json: content.json, expected_updated_at: updatedAt,
      };
      const url = id ? '/api/admin-v2/articles/' + id : '/api/admin-v2/articles';
      const response = await fetch(url, { method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? 'Enregistrement impossible.');
      setUpdatedAt(result.data.updated_at);
      setStatus(result.data.status);
      if (result.data.short_code) setShortCode(result.data.short_code);
      setDirty(false);
      setSuccess('Article enregistré.');
      if (!id) router.replace('/admin-v2/articles/' + result.data.id + '/edit');
      return result.data;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
      return null;
    } finally { setSaving(false); }
  }, [canEdit, form, keywords, content.json, updatedAt, id, router]);

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    const onKeyboardShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (canEdit && loaded && !saving) void save();
      }
      if (event.key === 'Escape') setPreviewOpen(false);
    };
    document.addEventListener('keydown', onKeyboardShortcut);
    return () => document.removeEventListener('keydown', onKeyboardShortcut);
  }, [save, canEdit, loaded, saving]);

  async function copyPublicLink() {
    if (!articleLink || status !== 'published') return;
    try {
      await navigator.clipboard.writeText(window.location.origin + articleLink);
      setSuccess('Lien public copié.');
    } catch { setError('Impossible de copier le lien automatiquement.'); }
  }

  async function workflow(
    action: 'submit' | 'approve' | 'publish' | 'revert' | 'schedule' | 'activate'
      | 'deactivate' | 'archive' | 'restore',
    scheduledAt?: string,
  ) {
    if (action === 'schedule' && (!scheduledAt || Date.parse(scheduledAt) <= Date.now()+60_000)) {
      setError('Choisissez une date future, heure de Libreville.');return;
    }
    if (action === 'archive' && !window.confirm('Archiver cet article et le retirer du site public ?')) return;
    if (action === 'deactivate' && !window.confirm('Retirer cet article du site public ?')) return;
    if (!id) return;
    if (action === 'publish' && !window.confirm('Publier cet article sur le site public ?')) return;
    let version = updatedAt;
    if (dirty) {
      const saved = await save();
      if (!saved) return;
      version = saved.updated_at;
    }
    setSaving(true); setError(''); setSuccess('');
    try {
      const response = await fetch('/api/admin-v2/articles/' + id + '/workflow', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, expected_updated_at: version, ...(scheduledAt ? {scheduled_at:scheduledAt} : {}) }), cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? 'Action impossible');
      setStatus(result.data.status);
      setPublicationDate(result.data.published_at ?? null);
      setUpdatedAt(result.data.updated_at);
      setScheduleOpen(false);
      setSuccess('Nouveau statut : ' + (statuses[result.data.status] ?? result.data.status) + '.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur réseau'); }
    finally { setSaving(false); }
  }

  async function upload(file: File) {
    if (!file.size || file.size > MAX_IMAGE_BYTES) {
      setError('La photo de couverture ne doit pas dépasser 1 Mo. Compressez-la avant l’import.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError('Choisissez une image JPEG, PNG, WebP, AVIF, GIF ou un autre format photo compatible.');
      return;
    }
    setError(''); setSuccess(''); setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('alt', form.title || file.name);
      const response = await fetch('/api/admin-v2/media', { method: 'POST', body, cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? 'Téléversement impossible');
      const item = result.data as Media;
      setMedia(current => [item, ...current]);
      setField('cover_media_id', item.id);
      setSuccess('Image vérifiée, optimisée au format WebP 1200 × 630 et enregistrée.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur image'); }
    finally { setUploading(false); }
  }

  return (
    <div className="v2-article-form v2-compose-workspace">
      <header className="v2-compose-header">
        <div className="v2-compose-title-block">
          <nav className="v2-compose-breadcrumb" aria-label="Fil d’Ariane">
            <Link href="/admin-v2"><ArrowLeft size={14} /> Administration</Link>
            <span aria-hidden="true">/</span>
            <Link href="/admin-v2/articles">Articles</Link>
            <span aria-hidden="true">/</span>
            <strong>{id ? 'Modifier' : 'Nouvel article'}</strong>
          </nav>
          <div className="v2-compose-title-line">
            <span className="v2-compose-title-icon"><FileText size={25} strokeWidth={1.8} /></span>
            <div>
              <p className="v2-compose-eyebrow">TV+ AFRIQUE · STUDIO ÉDITORIAL</p>
              <h1>{id ? 'Édition de l’article' : 'Nouvel article'}</h1>
              <p className="v2-compose-subtitle">Rédaction, référencement et préparation à la publication.</p>
            </div>
          </div>
        </div>
        <div className="v2-compose-header-actions">
          <div className="v2-compose-signal" aria-live="polite">
            <span className={'v2-compose-status-badge status-' + status}>{statuses[status] ?? status}</span>
            <span className={'v2-compose-save-state ' + (dirty ? 'is-dirty' : '')}>
              {saving ? 'Enregistrement…' : dirty ? 'Modifications non enregistrées' :
                id ? 'Modifications enregistrées' : 'Nouvel article'}
            </span>
          </div>
          <div className="v2-compose-action-row">
            <button type="button" className="v2-compose-button secondary" onClick={() => setPreviewOpen(true)}
              disabled={!loaded}><Eye size={17} /> Prévisualiser</button>
            {canEdit && <button type="button" className="v2-compose-button primary"
              onClick={() => void save()} disabled={saving || !loaded}>
              <Save size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>}
          </div>
        </div>
      </header>

      <nav className="v2-compose-jumpnav" aria-label="Étapes de rédaction">
        <a href="#article-identite"><span>01</span> Informations</a>
        <a href="#article-contenu"><span>02</span> Rédaction</a>
        <a href="#article-seo"><span>03</span> SEO et partage</a>
        <a href="#article-publication"><span>04</span> Publication</a>
      </nav>

      {error && <div className="v2-error v2-compose-feedback" role="alert">{error}</div>}
      {success && <div className="v2-success v2-compose-feedback" role="status">{success}</div>}

      {!loaded ? <div className="v2-compose-loading" role="status">Chargement de votre espace de rédaction…</div> : (
        <div className="v2-compose-columns">
          <div className="v2-compose-main">
            <section className="v2-card v2-compose-card" id="article-identite" aria-labelledby="article-identite-title">
              <div className="v2-compose-card-header">
                <div><span className="v2-compose-number">01 · IDENTITÉ ÉDITORIALE</span>
                  <h2 id="article-identite-title">Informations de l’article</h2>
                  <p>Les éléments qui identifient votre sujet sur TV+ Afrique.</p></div>
              </div>
              <label className="v2-field v2-compose-title-field">
                <span>Titre principal <b aria-hidden="true">*</b></span>
                <input className="v2-editor-title-input" maxLength={220} required disabled={!canEdit}
                  placeholder="Quel est le sujet de votre article ?" value={form.title}
                  onChange={event => {
                    const title = event.target.value;
                    setForm(current => ({ ...current, title, slug: id ? current.slug : slugify(title) }));
                    setDirty(true); setSuccess('');
                  }} />
                <small className="v2-compose-field-count">{form.title.length} / 220 caractères</small>
              </label>
              <label className="v2-field">
                <span>Chapeau / résumé de l’article <b aria-hidden="true">*</b></span>
                <textarea className="v2-editor-chapeau" maxLength={2000} required disabled={!canEdit}
                  placeholder="Présentez l’essentiel de l’information en deux ou trois phrases…"
                  value={form.excerpt} onChange={event => setField('excerpt', event.target.value)} />
                <small className="v2-editor-help">Ce texte introduit l’article et sert de description SEO par défaut.</small>
              </label>
              <label className="v2-field v2-compose-keywords">
                <span>Mots-clés de l’article</span>
                <input value={keywords} disabled={!canEdit} maxLength={1350}
                  placeholder="Gabon, actualité, Libreville, institutions"
                  onChange={event => { setKeywords(event.target.value); setDirty(true); setSuccess(''); }} />
                <small className="v2-editor-help">Séparez chaque mot-clé par une virgule. <strong>{tagCount}/20</strong> mots-clés.</small>
              </label>
            </section>

            <section className="v2-card v2-compose-card v2-compose-writing" id="article-contenu"
              aria-labelledby="article-contenu-title">
              <div className="v2-compose-card-header">
                <div><span className="v2-compose-number">02 · PRODUCTION ÉDITORIALE</span>
                  <h2 id="article-contenu-title">Rédiger le contenu</h2>
                  <p>Un véritable espace de travail pour construire et mettre en forme votre article.</p></div>
                <div className="v2-compose-wordcount"><strong>{content.words}</strong><span>mots</span></div>
              </div>
              <div className="v2-field" style={{marginBottom:16}}>
                <label className="v2-field"><span>Reportage vidéo (facultatif)</span>
                  <input type="url" maxLength={1300} value={form.video_url} disabled={!canEdit} placeholder="https://www.youtube.com/watch?v=… ou lien Facebook" onChange={event=>setField('video_url',event.target.value)} />
                </label>
                <small className="v2-editor-help">Ajoutez un lien public pour transformer cet article en article vidéo. Le texte, la couverture et le référencement restent inchangés.</small>
                {form.video_url.trim() && !validVideo && <p className="v2-error" role="alert">Lien YouTube ou Facebook non reconnu.</p>}
                {validVideo && <div style={{maxWidth:'100%',marginTop:12}}><p>Plateforme : {validVideo.platform === 'youtube' ? 'YouTube' : 'Facebook'}</p><ReplayEmbed key={validVideo.url} title={form.title || 'Reportage vidéo'} url={validVideo.url} thumbnail={cover?.url}/></div>}
                {form.video_url && canEdit && <button type="button" className="v2-compose-button secondary" onClick={()=>setField('video_url','')}>Retirer la vidéo</button>}
              </div>
              <TiptapEditor initialJson={initialJson} editable={canEdit}
                onChange={value => { setContent(value); setDirty(true); }}
                autosaveHint="Sauvegarde manuelle · Ctrl/⌘ + S" />
            </section>

            <section className="v2-card v2-compose-card" id="article-seo" aria-labelledby="article-seo-title">
              <div className="v2-compose-card-header">
                <div><span className="v2-compose-number">03 · VISIBILITÉ EN LIGNE</span>
                  <h2 id="article-seo-title">SEO et partage</h2>
                  <p>Optimisez la visibilité de votre article dans les moteurs et sur les réseaux sociaux.</p></div>
              </div>
              <div className="v2-compose-search-preview">
                <span className="v2-compose-search-site">TV+ Afrique · Article</span>
                <strong>{form.seo_title.trim() || form.title.trim() || 'Le titre de votre article s’affichera ici'}</strong>
                <span>{form.seo_description.trim() || form.excerpt.trim() || 'Le chapeau de l’article apparaîtra ici.'}</span>
              </div>
              <div className="v2-editor-field-grid">
                <label className="v2-field">
                  <span>Titre SEO personnalisé</span>
                  <input value={form.seo_title} disabled={!canEdit} maxLength={200}
                    placeholder="Par défaut : le titre de l’article"
                    onChange={event => setField('seo_title', event.target.value)} />
                </label>
                <label className="v2-field">
                  <span>Identifiant lisible (slug)</span>
                  <input value={form.slug} disabled={!canEdit} required maxLength={120}
                    onChange={event => setField('slug', slugify(event.target.value))} />
                </label>
                <label className="v2-field is-wide">
                  <span>Description SEO personnalisée</span>
                  <textarea value={form.seo_description} disabled={!canEdit} maxLength={320}
                    placeholder="Par défaut : le chapeau de l’article"
                    onChange={event => setField('seo_description', event.target.value)} />
                </label>
              </div>
              <div className="v2-compose-shortlink">
                <Link2 size={16} aria-hidden="true" />
                <span className="v2-compose-shortlink-label">Adresse courte de partage</span>
                <code>{articleLink ? 'tvplusv2.vercel.app' + articleLink : 'Générée lors de la première sauvegarde'}</code>
                {status === 'published' && articleLink &&
                  <button type="button" className="v2-compose-link-button" onClick={() => void copyPublicLink()}>
                    <Copy size={14} /> Copier</button>}
              </div>
            </section>
          </div>

          <aside className="v2-compose-rail" aria-label="Paramètres et suivi de publication">
            <section className="v2-compose-side-card v2-compose-status-panel" id="article-publication"
              aria-labelledby="article-publication-title">
              <div className="v2-compose-side-heading">
                <span className="v2-compose-side-icon"><ShieldCheck size={18} /></span>
                <div><h2 id="article-publication-title">Publication</h2><span>Suivi et validation éditoriale</span></div>
              </div>
              <div className="v2-compose-publishing-summary">
                <span>Statut actuel</span>
                <strong>{statuses[status] ?? status}</strong>
                {updatedAt && <small>Dernière sauvegarde : {new Date(updatedAt).toLocaleString('fr-FR', {timeZone:'Africa/Libreville'})}</small>}
                {status === 'scheduled' && publicationDate &&
                  <small>Mise en ligne prévue : {new Date(publicationDate).toLocaleString('fr-FR', {timeZone:'Africa/Libreville'})}</small>}
              </div>
              <div className="v2-compose-progress-title">
                <strong>Préparation de l’article</strong>
                <span>{completeCount} / {checks.length}</span>
              </div>
              <div className="v2-compose-progress" role="progressbar" aria-label="Éléments de préparation renseignés"
                aria-valuemin={0} aria-valuemax={checks.length} aria-valuenow={completeCount}>
                <span style={{ width: (completeCount / checks.length * 100) + '%' }} />
              </div>
              <ul className="v2-compose-checklist">
                {checks.map(check => <li key={check.label} className={check.valid ? 'is-complete' : ''}>
                  {check.valid ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                  {check.label}
                </li>)}
              </ul>
              <p className="v2-compose-check-note">
                Ces repères sont indicatifs. La publication dépend aussi des droits et de la validation éditoriale.
              </p>
              <div className="v2-compose-publish-actions">
                {canEdit && <button type="button" className="v2-compose-button primary"
                  disabled={saving} onClick={() => void save()}>
                  <Save size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>}
                {id && canEdit && ['draft', 'in_review'].includes(status) &&
                  <button type="button" className="v2-compose-button secondary" disabled={saving}
                    onClick={() => void workflow('submit')}><Send size={15} /> Soumettre pour validation</button>}
                {id && canReview && status === 'in_review' &&
                  <button type="button" className="v2-compose-button secondary" disabled={saving}
                    onClick={() => void workflow('approve')}><Check size={16} /> Valider</button>}
                {id && canReview && ['draft','in_review','approved','scheduled'].includes(status) &&
                  <button type="button" className="v2-compose-button publish" disabled={saving}
                    onClick={() => void workflow('publish')}><ArrowUpRight size={16}/> Mettre en ligne</button>}
                {id && canReview && status === 'inactive' &&
                  <button type="button" className="v2-compose-button publish" disabled={saving}
                    onClick={() => void workflow('activate')}><ToggleRight size={16}/> Activer en ligne</button>}
                {id && canReview && status === 'published' &&
                  <button type="button" className="v2-compose-button secondary" disabled={saving}
                    onClick={() => void workflow('deactivate')}><ToggleLeft size={16}/> Désactiver en ligne</button>}
                {id && canReview && status === 'archived' &&
                  <button type="button" className="v2-compose-button secondary" disabled={saving}
                    onClick={() => void workflow('restore')}><RotateCcw size={16}/> Restaurer l’article</button>}
                {id && canReview && status === 'scheduled' &&
                  <button type="button" className="v2-compose-button secondary" disabled={saving}
                    onClick={() => void workflow('revert')}><RotateCcw size={16}/> Annuler la programmation</button>}
                {id && canReview && ['draft','in_review','approved','inactive','scheduled'].includes(status) &&
                  <div className="v2-compose-schedule">
                    <button type="button" className="v2-compose-button secondary" disabled={saving}
                      onClick={() => setScheduleOpen(x => !x)}><CalendarClock size={16}/> Programmer la publication</button>
                    {scheduleOpen && <div>
                      <label>Jour et heure (Libreville)
                        <input type="datetime-local" value={scheduleLocal}
                          onChange={event => setScheduleLocal(event.target.value)}/>
                      </label>
                      <button type="button" className="v2-compose-button primary" disabled={saving}
                        onClick={()=>{
                          const timestamp=new Date(scheduleLocal+':00+01:00');
                          if(Number.isNaN(timestamp.valueOf())) {setError('Date invalide.');return;}
                          void workflow('schedule',timestamp.toISOString());
                        }}>Confirmer la programmation</button>
                    </div>}
                  </div>}
                {id && canReview && status !== 'archived' &&
                  <button type="button" className="v2-compose-button secondary v2-compose-archive" disabled={saving}
                    onClick={() => void workflow('archive')}><Archive size={16}/> Archiver l’article</button>}
                <button type="button" className="v2-compose-button secondary"
                  disabled={!loaded} onClick={() => setPreviewOpen(true)}><Eye size={16} /> Aperçu de l’article</button>
              </div>
            </section>

            <section className="v2-compose-side-card" aria-labelledby="classement-title">
              <div className="v2-compose-side-heading">
                <span className="v2-compose-side-icon"><Globe2 size={17} /></span>
                <div><h2 id="classement-title">Classement éditorial</h2><span>Rubrique et localisation</span></div>
              </div>
              <label className="v2-field">
                <span>Catégorie <b aria-hidden="true">*</b></span>
                <select required value={form.category_id} disabled={!canEdit}
                  onChange={event => setField('category_id', event.target.value)}>
                  <option value="">Choisir une rubrique</option>
                  {categories.map(category =>
                    <option value={category.id} key={category.id}>{category.name}</option>)}
                </select>
              </label>
              <label className="v2-field">
                <span>Pays concerné <b aria-hidden="true">*</b></span>
                <select value={form.country_code} disabled={!canEdit}
                  onChange={event => {
                    const country = event.target.value;
                    setForm(current => ({
                      ...current, country_code: country,
                      province_slug: country === 'GA' ? current.province_slug : '',
                    }));
                    setDirty(true); setSuccess('');
                  }}>
                  {COUNTRIES.map(country =>
                    <option value={country.code} key={country.code}>{country.name}</option>)}
                </select>
              </label>
              {form.country_code === 'GA' &&
                <label className="v2-field">
                  <span>Province</span>
                  <select value={form.province_slug} disabled={!canEdit}
                    onChange={event => setField('province_slug', event.target.value)}>
                    <option value="">Tout le Gabon</option>
                    {GABON_PROVINCES.map(province =>
                      <option value={province.value} key={province.value}>{province.label}</option>)}
                  </select>
                </label>}
              <div className="v2-compose-switches">
                <label><span><strong>À la une</strong><small>Mettre l’article en avant</small></span>
                  <input type="checkbox" checked={form.featured} disabled={!canEdit}
                    onChange={event => setField('featured', event.target.checked)} /></label>
                <label><span><strong>Alerte info</strong><small>Signaler une actualité urgente</small></span>
                  <input type="checkbox" checked={form.is_alert} disabled={!canEdit}
                    onChange={event => setField('is_alert', event.target.checked)} /></label>
              </div>
            </section>

            <section className="v2-compose-side-card" aria-labelledby="article-couverture-title" id="article-couverture">
              <div className="v2-compose-side-heading">
                <span className="v2-compose-side-icon"><ImageIcon size={17} /></span>
                <div><h2 id="article-couverture-title">Couverture</h2><span>Visuel principal · 1200 × 630</span></div>
              </div>
              <div className="v2-compose-cover">
                {cover ? <img src={cover.url} alt={cover.alt || 'Couverture de l’article'} /> :
                  <div><ImagePlus size={23} /><span>Aucune image sélectionnée</span></div>}
              </div>
              <label className="v2-compose-upload">
                <ImagePlus size={16} />
                {uploading ? 'Importation en cours…' : 'Importer une image'}
                <input type="file" accept="image/*" disabled={!canEdit || uploading}
                  onChange={event => {
                    const file = event.target.files?.[0];
                    if (file) void upload(file);
                    event.target.value = '';
                  }} />
              </label>
              <p className="v2-compose-cover-help">JPEG, PNG, WebP, AVIF, GIF · maximum 1 Mo.</p>
              <details className="v2-compose-library">
                <summary>Choisir dans la médiathèque</summary>
                <div className="v2-image-grid">
                  {chosenMedia.map(item =>
                    <button type="button" key={item.id} className="v2-image-choice"
                      aria-pressed={form.cover_media_id === item.id} disabled={!canEdit}
                      title={item.alt || 'Choisir cette image'}
                      onClick={() => setField('cover_media_id', item.id)}>
                      <img src={item.url} alt={item.alt || 'Photo de la médiathèque'} loading="lazy" />
                    </button>)}
                </div>
                {media.length > chosenMedia.length &&
                  <button type="button" className="v2-compose-button secondary"
                    onClick={() => setMediaPage(page => page + 1)}>Voir plus d’images</button>}
              </details>
            </section>
          </aside>
        </div>
      )}

      {loaded && canEdit &&
        <div className="v2-compose-mobile-save">
          <span>{dirty ? 'Modifications en attente' : statuses[status] ?? status}</span>
          <button type="button" className="v2-compose-button primary"
            disabled={saving} onClick={() => void save()}>
            <Save size={15} /> {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>}

      {previewOpen && <div className="v2-compose-preview-backdrop"
        onClick={() => setPreviewOpen(false)} role="presentation">
        <div className="v2-compose-preview-dialog" role="dialog" aria-modal="true"
          aria-labelledby="compose-preview-title" onClick={event => event.stopPropagation()}>
          <header>
            <div><span className="v2-compose-eyebrow">PRÉVISUALISATION ÉDITORIALE</span>
              <h2 id="compose-preview-title">Aperçu de l’article</h2></div>
            <button type="button" onClick={() => setPreviewOpen(false)} aria-label="Fermer l’aperçu">
              <X size={21} /></button>
          </header>
          <p className="v2-compose-preview-note">Aperçu local non publié : la typographie finale est rendue sur le site public.</p>
          <div className="v2-compose-preview-body">
            <div className="v2-compose-preview-hero">
              {cover?.url && <img src={cover.url} alt="" />}
              <div className="v2-compose-preview-gradient" />
              <div className="v2-compose-preview-hero-text">
                <strong>{categoryName}</strong>
                <h3>{form.title.trim() || 'Votre titre d’article'}</h3>
                <p>{form.excerpt.trim() || 'Le résumé de l’article apparaîtra ici.'}</p>
              </div>
            </div>
            <div className="v2-compose-preview-article">
              <span>{countryName} {form.province_slug && '· ' + (GABON_PROVINCES.find(p => p.value === form.province_slug)?.label ?? '')}</span>
              {validVideo && <ReplayEmbed key={validVideo.url} title={form.title || 'Reportage vidéo'} url={validVideo.url} thumbnail={cover?.url}/>}
              <p>{content.text.trim() || 'Le corps du texte pourra être consulté après sa rédaction.'}</p>
            </div>
          </div>
          <footer>
            {status === 'published' && articleLink &&
              <a href={articleLink} target="_blank" rel="noopener noreferrer" className="v2-compose-button secondary">
                <ArrowUpRight size={15} /> Voir sur le site</a>}
            <button type="button" className="v2-compose-button primary" onClick={() => setPreviewOpen(false)}>
              Retour à la rédaction</button>
          </footer>
        </div>
      </div>}
    </div>
  );
}
