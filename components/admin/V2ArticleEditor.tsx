'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ImagePlus, FileText, Globe2, Image as ImageIcon } from 'lucide-react';
import TiptapEditor, { type EditorValue } from '../editor/TiptapEditor';
import { COUNTRIES, GABON_PROVINCES } from '../../lib/editor/countries';

type Category = { id: string; name: string; slug: string };
type Media = { id: string; url: string; alt: string; mime_type: string };
type ArticleForm = {
  title: string; slug: string; excerpt: string; category_id: string;
  cover_media_id: string | null; seo_title: string; seo_description: string;
  country_code: string; province_slug: string; featured: boolean; is_alert: boolean;
};
const initialForm: ArticleForm = {
  title: '', slug: '', excerpt: '', category_id: '', cover_media_id: null,
  seo_title: '', seo_description: '', country_code: 'GA', province_slug: '',
  featured: false, is_alert: false,
};
const emptyDoc = { type: 'doc', content: [{ type: 'paragraph' }] };
const statuses: Record<string, string> = {
  draft: 'Brouillon', in_review: 'À valider', approved: 'Validé',
  scheduled: 'Programmé', published: 'Publié',
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

  const canEdit = canReview || (ownerId === actorId && ['draft', 'in_review'].includes(status));
  const cover = useMemo(() => media.find(item => item.id === form.cover_media_id), [media, form.cover_media_id]);
  const chosenMedia = useMemo(() => media.slice(0, mediaPage * 18), [media, mediaPage]);
  const tagCount = parseKeywords(keywords).length;

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
        setContent({ json: article.content_json ?? emptyDoc, text: '', words: 0 });
        setStatus(article.status);
        setShortCode(article.short_code ?? null);
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
      setSuccess('Article enregistré dans Supabase.');
      if (!id) router.replace('/admin-v2/articles/' + result.data.id + '/edit');
      return result.data;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau');
      return null;
    } finally { setSaving(false); }
  }, [canEdit, form, keywords, content.json, updatedAt, id, router]);

  async function workflow(action: 'submit' | 'approve' | 'publish' | 'revert') {
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
        body: JSON.stringify({ action, expected_updated_at: version }), cache: 'no-store',
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? 'Action impossible');
      setStatus(result.data.status);
      setUpdatedAt(result.data.updated_at);
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
    <div className="v2-article-form">
      <div className="v2-head">
        <div>
          <Link href="/admin-v2/articles" className="admin-link">← Tous les articles</Link>
          <h1 className="v2-title">{id ? 'Modifier l’article' : 'Rédiger un article'}</h1>
          <p className="v2-lede">{statuses[status] ?? status} {dirty ? '· Modifications non enregistrées' : ''}</p>
          <span className="v2-editor-url">Lien de partage :
            <code>{shortCode ? '/a/' + shortCode : 'créé automatiquement à la première sauvegarde'}</code>
          </span>
        </div>
        <div className="v2-actions">
          <button type="button" className="admin-btn admin-btn-primary" disabled={saving || !loaded || !canEdit}
            onClick={() => void save()}>{saving ? 'Enregistrement…' : 'Enregistrer le brouillon'}</button>
          {id && canEdit && ['draft', 'in_review'].includes(status) &&
            <button type="button" className="admin-btn admin-btn-ghost" disabled={saving} onClick={() => workflow('submit')}>Soumettre</button>}
          {id && canReview && status === 'in_review' &&
            <button type="button" className="admin-btn admin-btn-ghost" disabled={saving} onClick={() => workflow('approve')}>Valider</button>}
          {id && canReview && status !== 'published' &&
            <button type="button" className="admin-btn admin-btn-primary" disabled={saving} onClick={() => workflow('publish')}>Publier</button>}
          {id && canReview && status === 'published' &&
            <button type="button" className="admin-btn admin-btn-ghost" disabled={saving} onClick={() => workflow('revert')}>Dépublier</button>}
        </div>
      </div>

      {error && <p className="v2-error" role="alert">{error}</p>}
      {success && <p className="v2-success" role="status">{success}</p>}
      {!loaded ? <div className="v2-card" role="status">Chargement de l’article…</div> : (
        <>
          <section className="v2-card" aria-labelledby="article-identite">
            <div className="v2-editor-section-heading">
              <span className="v2-editor-step">1</span>
              <div><h2 id="article-identite">Informations de l’article</h2>
                <p>Préparez le titre, le chapeau, les mots-clés et le classement de votre sujet.</p></div>
            </div>
            <div className="v2-editor-field-grid">
              <label className="v2-field is-wide">
                <span>Titre de l’article *</span>
                <input className="v2-editor-title-input" maxLength={220} required disabled={!canEdit}
                  placeholder="Saisir le titre principal…" value={form.title}
                  onChange={event => {
                    const title = event.target.value;
                    setForm(current => ({ ...current, title, slug: id ? current.slug : slugify(title) }));
                    setDirty(true);
                  }} />
              </label>
              <label className="v2-field is-wide">
                <span>Chapeau de l’article *</span>
                <textarea className="v2-editor-chapeau" value={form.excerpt} maxLength={2000} required
                  disabled={!canEdit} placeholder="Résumez en deux ou trois phrases l’essentiel de l’article…"
                  onChange={event => setField('excerpt', event.target.value)} />
                <small className="v2-editor-help">Ce résumé apparaît dans l’aperçu des articles et sert de description SEO par défaut.</small>
              </label>
              <label className="v2-field is-wide v2-editor-keywords">
                <span>Mots-clés</span>
                <input value={keywords} disabled={!canEdit} maxLength={1350}
                  placeholder="actualité gabonaise, économie, Libreville"
                  onChange={event => { setKeywords(event.target.value); setDirty(true); setSuccess(''); }} />
                <small className="v2-editor-help">Séparez les mots-clés par une virgule · {tagCount}/20 mots-clés</small>
              </label>
              <label className="v2-field">
                <span><Globe2 size={15} aria-hidden="true" /> Pays concerné *</span>
                <select value={form.country_code} disabled={!canEdit}
                  onChange={event => {
                    const country = event.target.value;
                    setForm(current => ({ ...current, country_code: country, province_slug: country === 'GA' ? current.province_slug : '' }));
                    setDirty(true);
                  }}>
                  {COUNTRIES.map(country => <option value={country.code} key={country.code}>{country.name}</option>)}
                </select>
              </label>
              {form.country_code === 'GA' && (
                <label className="v2-field">
                  <span>Province du Gabon</span>
                  <select value={form.province_slug} disabled={!canEdit}
                    onChange={event => setField('province_slug', event.target.value)}>
                    <option value="">Tout le Gabon / Non précisée</option>
                    {GABON_PROVINCES.map(province =>
                      <option key={province.value} value={province.value}>{province.label}</option>)}
                  </select>
                </label>
              )}
              <label className="v2-field">
                <span>Rubrique *</span>
                <select value={form.category_id} disabled={!canEdit} required
                  onChange={event => setField('category_id', event.target.value)}>
                  <option value="">Sélectionner la rubrique</option>
                  {categories.map(category => <option value={category.id} key={category.id}>{category.name}</option>)}
                </select>
                {!categories.length && <small className="v2-editor-help">Les rubriques sont chargées depuis les paramètres du site.</small>}
              </label>
            </div>
            <details className="v2-editor-collapsible">
              <summary>Référencement SEO avancé et lien de l’article (facultatif)</summary>
              <div className="v2-editor-field-grid">
                <label className="v2-field">
                  <span>Titre SEO personnalisé</span>
                  <input value={form.seo_title} disabled={!canEdit} maxLength={200}
                    placeholder="Par défaut : le titre de l’article"
                    onChange={event => setField('seo_title', event.target.value)} />
                </label>
                <label className="v2-field">
                  <span>Lien lisible (slug)</span>
                  <input value={form.slug} disabled={!canEdit} required maxLength={120}
                    onChange={event => setField('slug', slugify(event.target.value))} />
                  <small className="v2-editor-help">Le lien partagé reste l’identifiant court /a/…</small>
                </label>
                <label className="v2-field is-wide">
                  <span>Description SEO personnalisée</span>
                  <textarea maxLength={320} disabled={!canEdit}
                    value={form.seo_description} placeholder="Par défaut : le chapeau de l’article"
                    onChange={event => setField('seo_description', event.target.value)} />
                </label>
              </div>
            </details>
            <div className="v2-editor-checks">
              <label><input type="checkbox" checked={form.featured} disabled={!canEdit}
                onChange={event => setField('featured', event.target.checked)} /> À la une</label>
              <label><input type="checkbox" checked={form.is_alert} disabled={!canEdit}
                onChange={event => setField('is_alert', event.target.checked)} /> Alerte info</label>
            </div>
          </section>

          <section className="v2-card" aria-labelledby="article-contenu">
            <div className="v2-editor-section-heading">
              <span className="v2-editor-step">2</span>
              <div><h2 id="article-contenu"><FileText size={18} aria-hidden="true" /> Contenu de l’article</h2>
                <p>Rédigez votre texte, choisissez la police, la taille et les couleurs sans quitter l’éditeur.</p></div>
            </div>
            <TiptapEditor initialJson={initialJson}
              onChange={value => { setContent(value); setDirty(true); }}
              autosaveHint="Cliquez sur Enregistrer pour sauvegarder." />
          </section>

          <section className="v2-card" aria-labelledby="article-couverture">
            <div className="v2-editor-section-heading">
              <span className="v2-editor-step">3</span>
              <div><h2 id="article-couverture"><ImageIcon size={18} aria-hidden="true" /> Photo de couverture</h2>
                <p>JPEG, PNG, WebP, AVIF ou GIF — 1 Mo maximum. Format de sortie : 1200 × 630 pixels.</p></div>
            </div>
            <div className="v2-cover-layout">
              <div className="v2-cover-preview" aria-label="Aperçu de la couverture">
                {cover ? <img src={cover.url} alt={cover.alt || 'Photo de couverture'} /> :
                  <div className="v2-cover-empty"><ImagePlus size={28} aria-hidden="true" />
                    <p>{form.cover_media_id ? 'Image existante sélectionnée, hors des médias récents' :
                      'Aucune photo de couverture sélectionnée'}</p></div>}
              </div>
              <div>
                <label className="v2-cover-upload">
                  <strong>Importer une nouvelle photo</strong>
                  <span className="v2-editor-help">Limite stricte : 1 Mo par fichier. Les images compatibles sont optimisées en WebP.</span>
                  <input type="file" accept="image/*" disabled={!canEdit || uploading}
                    onChange={event => {
                      const file = event.target.files?.[0];
                      if (file) void upload(file);
                      event.target.value = '';
                    }} />
                  {uploading && <small role="status">Optimisation et téléversement…</small>}
                </label>
                <details className="v2-cover-options">
                  <summary>Ou choisir une photo de la médiathèque</summary>
                  <div className="v2-image-grid">
                    {chosenMedia.map(item => (
                      <button key={item.id} type="button" disabled={!canEdit}
                        className="v2-image-choice" aria-pressed={form.cover_media_id === item.id}
                        title={item.alt || 'Sélectionner cette photo'}
                        onClick={() => setField('cover_media_id', item.id)}>
                        <img src={item.url} alt={item.alt || 'Photo de la médiathèque'} loading="lazy" />
                      </button>
                    ))}
                  </div>
                  {media.length > chosenMedia.length &&
                    <button type="button" className="admin-btn admin-btn-ghost"
                      onClick={() => setMediaPage(page => page + 1)}>Afficher plus de photos</button>}
                </details>
              </div>
            </div>
          </section>
          <div className="v2-editor-footer-actions">
            <button type="button" className="admin-btn admin-btn-primary" disabled={saving || !canEdit}
              onClick={() => void save()}>{saving ? 'Enregistrement…' : 'Enregistrer le brouillon'}</button>
          </div>
        </>
      )}
    </div>
  );
}
