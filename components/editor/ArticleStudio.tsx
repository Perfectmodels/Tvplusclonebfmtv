'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, Eye, Send, CheckCircle2, Archive, Clock3, RotateCcw, Copy } from 'lucide-react';
import TiptapEditor, { type EditorValue } from './TiptapEditor';
import CoverPicker, { type CoverValue } from './CoverPicker';
import SeoPanel from './SeoPanel';
import TagInput from './TagInput';
import ArticlePreview from './ArticlePreview';
import { useToast } from '../admin/ToastProvider';

const PROVINCES = ['Estuaire', 'Haut-Ogooué', 'Moyen-Ogooué', 'Ngounié', 'Nyanga', 'Ogooué-Ivindo', 'Ogooué-Lolo', 'Ogooué-Maritime', 'Woleu-Ntem'];

const COUNTRY_CODES = ('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW').split(' ');
const countryNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
  ? new Intl.DisplayNames(['fr'], { type: 'region' })
  : null;
const COUNTRIES = COUNTRY_CODES.map((code) => ({ value: code, label: countryNames?.of(code) ?? code }));

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', review: 'En attente de validation', needs_correction: 'À corriger',
  validated: 'Validé', scheduled: 'Programmé', published: 'Publié', archived: 'Archivé',
};

type FormState = {
  title: string; slug: string; chapter: string; summary: string; category_slug: string;
  country_code: string; province: string; author: string; status: string; scheduled_at: string;
  image_url: string; source_media_id: string; cover_alt: string; cover_credit: string;
  cover_caption: string; source_url: string; kind: string; robots: string;
  seo_title: string;
  is_alert: boolean;
  featured: boolean;
};

const EMPTY: FormState = {
  title: '', slug: '', chapter: '', summary: '', category_slug: '', country_code: 'GA', province: '',
  author: '', status: 'draft', scheduled_at: '', image_url: '', source_media_id: '', cover_alt: '',
  cover_credit: '', cover_caption: '', source_url: '', kind: '', robots: 'index,follow',
  seo_title: '',
  is_alert: false,
  featured: false,
};

function slugify(value: string) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
}

export default function ArticleStudio({ id }: { id?: string }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [content, setContent] = useState<EditorValue>({ json: null, text: '', words: 0 });
  const [cover, setCover] = useState<CoverValue>({ url: '', mediaId: null, alt: '', credit: '', caption: '' });
  const [tags, setTags] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [version, setVersion] = useState(1);
  const [shortId, setShortId] = useState<string>('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [siteUrl, setSiteUrl] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const fetchArticle = useCallback(async () => {
    if (!id) return;
    try {
      const response = await fetch(`/api/admin/articles/${id}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Chargement impossible.');
      const a = body.data;
      setForm({
        title: a.title ?? '', slug: a.slug ?? '', chapter: a.chapter ?? '', summary: a.summary ?? '',
        category_slug: a.category_slug ?? '', country_code: a.country_code ?? 'GA', province: a.province ?? '',
        author: a.author ?? '', status: a.status ?? 'draft',
        scheduled_at: a.scheduled_at ? new Date(a.scheduled_at).toISOString().slice(0, 16) : '',
        image_url: a.image_url ?? '', source_media_id: a.source_media_id ?? '', cover_alt: a.cover_alt ?? '',
        cover_credit: a.cover_credit ?? '', cover_caption: a.cover_caption ?? '', source_url: a.source_url ?? '',
        kind: a.kind ?? '', robots: a.robots ?? 'index,follow',
        seo_title: a.seo_title ?? '',
        is_alert: (a as any).is_alert ?? (a.kind === 'alert'),
        featured: a.featured ?? false,
      });
      setCover({ url: a.image_url ?? '', mediaId: a.source_media_id ?? null, alt: a.cover_alt ?? '', credit: a.cover_credit ?? '', caption: a.cover_caption ?? '' });
      setContent({ json: a.content_json ?? null, text: '', words: a.word_count ?? 0 });
      setTags(a.tags ?? []);
      setKeywords(a.keywords ?? []);
      setVersion(a.version ?? 1);
      setShortId(a.shortId ?? '');
    } catch (err) {
      error(err instanceof Error ? err.message : 'Erreur de chargement.');
    } finally {
      setLoading(false);
    }
  }, [id, error]);

  useEffect(() => {
    setSiteUrl(window.location.origin);
    fetch('/api/admin/categories').then((r) => r.json()).then((b) => {
      setCategories((b.data?.items ?? []).map((c: any) => ({ value: c.slug, label: c.name })));
    }).catch(() => {});
    fetchArticle();
  }, [fetchArticle]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const buildPayload = useCallback(() => ({
    title: form.title, slug: form.slug, chapter: form.chapter, summary: form.summary,
    category_slug: form.category_slug, country_code: form.country_code, province: form.province || null,
    author: form.author || null, status: form.status,
    scheduled_at: form.status === 'scheduled' && form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
    image_url: cover.url || null, source_media_id: cover.mediaId, cover_alt: cover.alt || null,
    cover_credit: cover.credit || null, cover_caption: cover.caption || null,
    source_url: form.source_url || null, kind: form.kind || null,
    content_json: content.json, body: content.text, tags, keywords,
    is_alert: form.is_alert,
    featured: form.featured,
    seo_title: form.seo_title || form.title.slice(0, 60),
    seo_description: form.chapter.slice(0, 160),
    canonical_url: null, robots: form.robots,
    expected_version: version,
  }), [form, cover, content, tags, keywords, version]);

  const save = useCallback(async (silent = false) => {
    if (!form.title.trim()) {
      if (!silent) error('Le titre est obligatoire avant l’enregistrement.');
      return false;
    }
    setSaving(true);
    try {
      const endpoint = id ? `/api/admin/articles/${id}` : '/api/admin/articles';
      const response = await fetch(endpoint, {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const body = await response.json();
      if (response.status === 409) {
        error('Conflit : une autre personne a modifié cet article. Rechargez la page.');
        setDirty(false);
        return false;
      }
      if (!response.ok) throw new Error(body?.error?.message ?? 'Enregistrement impossible.');
      if (body.data?.short_id || body.data?.shortId) {
        setShortId(body.data.short_id ?? body.data.shortId);
      }
      if (!id && body.data?.id) {
        router.replace(`/admin/articles/${body.data.id}/edit`);
      } else {
        setVersion(body.data?.version ?? version);
      }
      setSavedAt(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
      setDirty(false);
      if (!silent) success('Article enregistré.');
      return true;
    } catch (err) {
      if (!silent) error(err instanceof Error ? err.message : 'Erreur d’enregistrement.');
      return false;
    } finally {
      setSaving(false);
    }
  }, [id, buildPayload, router, error, success, version]);

  useEffect(() => {
    if (!dirty || !id || saving) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { save(true); }, 1800);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [dirty, id, saving, save]);

  async function workflow(action: string) {
    if (form.status === 'scheduled' && !form.scheduled_at) { error('Choisissez une date de programmation.'); return; }
    if (action === 'publish' || action === 'validate' || action === 'schedule') {
      if (!form.title.trim() || content.words === 0 || !cover.url) {
        error('Titre, contenu et image de couverture sont requis avant publication.');
        return;
      }
      if (!cover.alt.trim()) { error('Le texte alternatif de l’image est obligatoire.'); return; }
    }
    const okSave = await save(true);
    if (!okSave || !id) return;
    try {
      const response = await fetch(`/api/admin/articles/${id}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : undefined,
          expected_version: version,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Action impossible.');
      success('Statut mis à jour : ' + (STATUS_LABELS[body.data.status] ?? body.data.status));
      setVersion(body.data.version ?? version);
      setForm((f) => ({ ...f, status: body.data.status }));
    } catch (err) {
      error(err instanceof Error ? err.message : 'Erreur.');
    }
  }

  if (loading) return <div className="admin-page"><div className="admin-skeleton"><span /><span /><span /></div></div>;

  return (
    <div className="studio">
      <div className="studio-head">
        <div>
          <nav className="admin-breadcrumb">Rédaction / Articles / {id ? 'Modifier' : 'Créer'}</nav>
          <h2>{id ? 'Modifier l’article' : 'Nouvel article'}</h2>
          <p>
            Statut : <span className={'admin-badge status-' + form.status}>{STATUS_LABELS[form.status] ?? form.status}</span>
            {savedAt && <span className="studio-saved"> · Enregistré à {savedAt}</span>}
            {dirty && <span className="studio-dirty"> · Modifications non enregistrées</span>}
          </p>
        </div>
        <div className="studio-actions">
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            disabled={!shortId}
            onClick={async () => {
              if (!shortId) return;
              try {
                await navigator.clipboard.writeText(`${window.location.origin}/a/${shortId}`);
                success('Lien court copié.');
              } catch { error('Copie impossible.'); }
            }}
          ><Copy size={15} /> Copier le lien court</button>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setPreview(true)}><Eye size={15} /> Prévisualiser</button>
          <button type="button" className="admin-btn admin-btn-ghost" onClick={() => save(false)} disabled={saving}><Save size={15} /> {saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => workflow('publish')}>Publier</button>
        </div>
      </div>

      <div className="studio-grid">
        <div className="studio-main">
          <div className="studio-field">
            <label className="field-label" htmlFor="studio-title">Titre de l’article <b>*</b></label>
            <input
              id="studio-title"
              className="studio-title-input"
              value={form.title}
              maxLength={180}
              placeholder="Saisissez le titre de votre article…"
              onChange={(e) => {
                const value = e.target.value;
                setForm((f) => ({ ...f, title: value, slug: slugify(value) }));
                setDirty(true);
              }}
            />
            <div className="field-meta"><span>{form.title.length}/180 caractères</span><span>L’URL courte est générée automatiquement</span></div>
          </div>

          <div className="studio-field">
            <label className="field-label" htmlFor="studio-chapter">Chapô / introduction</label>
            <textarea
              id="studio-chapter"
              rows={3}
              maxLength={300}
              value={form.chapter}
              placeholder="Résumé journalistique affiché sous le titre…"
              onChange={(e) => set('chapter', e.target.value)}
            />
            <div className="field-meta"><span>{form.chapter.length}/300 caractères</span></div>
          </div>

          <div className="studio-field">
            <TagInput value={keywords} onChange={(v) => { setKeywords(v); setDirty(true); }} label="Mots-clés" />
          </div>

          <div className="studio-field">
            <span className="field-label">Image de couverture</span>
            <CoverPicker value={cover} onChange={(next) => { setCover(next); setDirty(true); }} />
          </div>

          <div className="studio-field">
            <span className="field-label">Contenu de l’article</span>
            <TiptapEditor initialJson={content.json ?? undefined} onChange={(value) => { setContent(value); setDirty(true); }} />
          </div>
        </div>

        <aside className="studio-side">
          <details className="studio-panel" open>
            <summary>Publication</summary>
            <div className="studio-panel-body">
              <label><span>Statut</span>
                <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label><span>Date de programmation (Africa/Libreville)</span>
                <input type="datetime-local" value={form.scheduled_at} onChange={(e) => set('scheduled_at', e.target.value)} />
              </label>
              <div className="studio-flags">
                <label className="studio-check">
                  <input type="checkbox" checked={form.is_alert} onChange={(e) => { setForm((f) => ({ ...f, is_alert: e.target.checked })); setDirty(true); }} />
                  <span><strong>Alerte info</strong><small>Afficher dans les sujets du header avec le badge rouge</small></span>
                </label>
                <label className="studio-check">
                  <input type="checkbox" checked={form.featured} onChange={(e) => { setForm((f) => ({ ...f, featured: e.target.checked })); setDirty(true); }} />
                  <span><strong>À la une</strong><small>Mettre en avant dans les sujets du header</small></span>
                </label>
              </div>

              <div className="studio-workflow">
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => workflow('submit')}><Send size={14} /> Soumettre</button>
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => workflow('validate')}><CheckCircle2 size={14} /> Valider</button>
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => workflow('unpublish')}><RotateCcw size={14} /> Dépublier</button>
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => workflow('archive')}><Archive size={14} /> Archiver</button>
              </div>
            </div>
          </details>

          <details className="studio-panel" open>
            <summary>Taxonomie</summary>
            <div className="studio-panel-body">
              <label><span>Catégorie <b>*</b></span>
                <select value={form.category_slug} onChange={(e) => set('category_slug', e.target.value)}>
                  <option value="">Sélectionner…</option>
                  {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </label>
              <label><span>Pays</span>
                <select value={form.country_code} onChange={(e) => set('country_code', e.target.value)}>
                  {COUNTRIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </label>
              <label><span>Province / localisation {form.country_code !== 'GA' && <small>(Gabon uniquement)</small>}</span>
                <select
                  value={form.province}
                  disabled={form.country_code !== 'GA'}
                  onChange={(e) => set('province', e.target.value)}
                >
                  <option value="">—</option>
                  {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
              <TagInput value={tags} onChange={(v) => { setTags(v); setDirty(true); }} label="Tags éditoriaux" suggestions={categories.map((c) => c.label)} />
              <label><span>Auteur</span>
                <input value={form.author} onChange={(e) => set('author', e.target.value)} placeholder="Prérempli depuis la session" />
              </label>
            </div>
          </details>

          <details className="studio-panel">
            <summary>Référencement SEO</summary>
            <div className="studio-panel-body">
              <SeoPanel
                seoTitle={form.seo_title}
                onSeoTitleChange={(value) => { set('seo_title', value); }}
                robots={form.robots}
                onRobotsChange={(value) => set('robots', value)}
                title={form.title}
                chapter={form.chapter}
                siteUrl={siteUrl}
                shortId={shortId}
              />
            </div>
          </details>
        </aside>
      </div>

      <ArticlePreview
        open={preview}
        onClose={() => setPreview(false)}
        title={form.title}
        chapter={form.chapter}
        cover={cover.url}
        content={content.json}
        category={categories.find((c) => c.value === form.category_slug)?.label ?? ''}
        author={form.author}
        publishedAt={undefined}
        readingTime={Math.max(1, Math.round(content.words / 220))}
      />
    </div>
  );
}
