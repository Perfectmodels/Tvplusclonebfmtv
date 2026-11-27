'use client';
import {useNotifications} from '../notifications/NotificationProvider';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Film, Loader2, Pencil, RefreshCw, Search, Trash2, Upload, X } from 'lucide-react';
import {
  sproutSelectable,
  sproutStateLabel,
  type SproutVideo,
  type SproutVideoKind,
  type SproutVideoPage,
} from '../../lib/video/sproutvideo-types';
import styles from './SproutVideoLibrary.module.css';

const PAGE_SIZE = 24;

type Processing = { id: string; title: string; progress: number };
type Editing = { id: string; title: string };

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' Go';
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' Mo';
  return Math.max(1, Math.round(bytes / 1024)).toLocaleString('fr-FR') + ' Ko';
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (!minutes) return rest + ' s';
  return minutes + ' min' + (rest ? ' ' + rest + ' s' : '');
}

function fileTitle(name: string) {
  return name.replace(/\.[^.]+$/, '').trim().slice(0, 200) || 'Vidéo';
}

function uploadErrorMessage(status: number, body: unknown) {
  if (body && typeof body === 'object') {
    for (const key of ['error_message', 'error', 'message'] as const) {
      const value = (body as Record<string, unknown>)[key];
      if (typeof value === 'string' && value.trim() && value.length < 300) return value.trim();
    }
  }
  if (status === 401 || status === 403) return 'Le jeton de téléversement a expiré. Réessayez.';
  if (status === 413) return 'Le stockage SproutVideo est plein ou la vidéo dépasse la limite du forfait.';
  if (status === 415) return 'Ce format vidéo n’est pas pris en charge par SproutVideo.';
  if (status === 429) return 'SproutVideo limite les requêtes. Réessayez dans un instant.';
  return 'SproutVideo a refusé le téléversement (code ' + status + ').';
}

function videoDetails(video: SproutVideo) {
  const parts = [video.vertical ? 'Verticale' : 'Horizontale'];
  if (video.durationSeconds) parts.push(formatDuration(video.durationSeconds));
  if (video.createdAt) {
    parts.push(new Date(video.createdAt).toLocaleDateString('fr-FR', { timeZone: 'Africa/Libreville' }));
  }
  return parts.join(' · ');
}

export default function SproutVideoLibrary({
  kind,
  onSelect,
  disabled = false,
  compact = false,
}: {
  kind?: SproutVideoKind;
  onSelect?: (video: SproutVideo) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const {confirm:askConfirm}=useNotifications();
  const [data, setData] = useState<SproutVideoPage | null>(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processing, setProcessing] = useState<Processing | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [posterFor, setPosterFor] = useState('');
  const [busyId, setBusyId] = useState('');

  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const aliveRef = useRef(true);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      xhrRef.current?.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    setPage(1);
    setQuery('');
    setEditing(null);
  }, [kind]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    if (kind) params.set('kind', kind);
    fetch('/api/admin-v2/sproutvideo?' + params.toString(), { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.success) throw new Error(body?.error?.message || 'Vidéothèque indisponible.');
        return body.data as SproutVideoPage;
      })
      .then(result => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch(err => {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : 'Vidéothèque indisponible.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [kind, page, refreshKey]);

  const refresh = useCallback(() => setRefreshKey(key => key + 1), []);

  const items = useMemo(() => {
    const search = query.trim().toLocaleLowerCase('fr');
    if (!search) return data?.items ?? [];
    return (data?.items ?? []).filter(video => video.title.toLocaleLowerCase('fr').includes(search));
  }, [data, query]);

  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function chooseFile(selected: File | null) {
    if (!selected) return;
    if (!selected.size) {
      setError('Ce fichier est vide.');
      return;
    }
    if (selected.size > 5 * 1024 * 1024 * 1024) {
      setError('La vidéo doit peser 5 Go maximum.');
      return;
    }
    setError('');
    setMessage('');
    setFile(selected);
    setUploadTitle(fileTitle(selected.name));
    setUploadOpen(true);
  }

  function putVideo(token: string, source: File, title: string) {
    return new Promise<{ id: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open('POST', 'https://api.sproutvideo.com/v1/videos');
      xhr.upload.onprogress = event => {
        if (event.lengthComputable && event.total > 0 && aliveRef.current) {
          setUploadProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
        }
      };
      xhr.onerror = () => reject(new Error('Connexion à SproutVideo interrompue. Vérifiez le réseau puis réessayez.'));
      xhr.onabort = () => reject(new Error('Téléversement annulé.'));
      xhr.onload = () => {
        let body: unknown = null;
        try {
          body = JSON.parse(xhr.responseText);
        } catch {
          body = null;
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          const id = body && typeof body === 'object' ? (body as { id?: unknown }).id : null;
          if (typeof id === 'string' && id) {
            resolve({ id });
            return;
          }
          reject(new Error('Réponse inattendue de SproutVideo après le téléversement.'));
          return;
        }
        reject(new Error(uploadErrorMessage(xhr.status, body)));
      };
      const form = new FormData();
      form.append('token', token);
      form.append('source_video', source);
      if (title) form.append('title', title);
      xhr.send(form);
    });
  }

  async function trackProcessing(id: string, title: string) {
    const started = Date.now();
    const suffix = kind ? '?kind=' + encodeURIComponent(kind) : '';
    const poll = async () => {
      if (!aliveRef.current) return;
      try {
        const response = await fetch('/api/admin-v2/sproutvideo/' + encodeURIComponent(id) + suffix, { cache: 'no-store' });
        const body = await response.json().catch(() => null);
        if (!response.ok || !body?.success) throw new Error(body?.error?.message || 'Suivi du traitement impossible.');
        const video = body.data as SproutVideo;
        if (!aliveRef.current) return;
        if (video.state === 'failed') {
          setProcessing(null);
          setError('SproutVideo n’a pas pu traiter « ' + title + ' ». Vérifiez le format puis réessayez.');
          refresh();
          return;
        }
        if (video.state === 'deployed') {
          setProcessing(null);
          refresh();
          if (sproutSelectable(video)) {
            setMessage('« ' + video.title + ' » est prête et disponible dans la vidéothèque.');
            onSelectRef.current?.(video);
          } else {
            setError('La vidéo est prête mais ne peut pas être intégrée. Activez la lecture publique et désactivez les embeds signés dans SproutVideo.');
          }
          return;
        }
        setProcessing({ id, title, progress: video.progress });
        if (Date.now() - started > 30 * 60 * 1000) {
          setProcessing(null);
          setError('Le traitement dure plus que prévu. La vidéo apparaîtra dans la vidéothèque dès qu’elle sera prête.');
          refresh();
          return;
        }
        timerRef.current = setTimeout(poll, 4000);
      } catch (err) {
        if (!aliveRef.current) return;
        if (Date.now() - started > 5 * 60 * 1000) {
          setProcessing(null);
          setError(err instanceof Error ? err.message : 'Suivi du traitement impossible.');
          refresh();
          return;
        }
        timerRef.current = setTimeout(poll, 6000);
      }
    };
    await poll();
  }

  async function startUpload() {
    if (disabled || uploading || !file) return;
    setUploading(true);
    setUploadProgress(0);
    setError('');
    setMessage('');
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setProcessing(null);
    try {
      const tokenResponse = await fetch('/api/admin-v2/sproutvideo/upload-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(kind ? { kind } : {}),
      });
      const tokenBody = await tokenResponse.json().catch(() => null);
      if (!tokenResponse.ok || !tokenBody?.success || typeof tokenBody.data?.token !== 'string') {
        throw new Error(tokenBody?.error?.message || 'Impossible de préparer le téléversement.');
      }
      const title = uploadTitle.trim().slice(0, 200) || fileTitle(file.name);
      const uploaded = await putVideo(tokenBody.data.token, file, title);
      setUploadProgress(100);
      setFile(null);
      setUploadTitle('');
      setUploadOpen(false);
      setMessage('Vidéo reçue par SproutVideo. Traitement en cours…');
      void trackProcessing(uploaded.id, title);
    } catch (err) {
      if (aliveRef.current) setError(err instanceof Error ? err.message : 'Téléversement impossible.');
    } finally {
      if (aliveRef.current) setUploading(false);
      xhrRef.current = null;
    }
  }

  function cancelUpload() {
    xhrRef.current?.abort();
    xhrRef.current = null;
    setUploadProgress(0);
    setUploading(false);
  }

  function startRename(video: SproutVideo) {
    setEditing({ id: video.id, title: video.title });
    setError('');
    setMessage('');
  }

  async function saveRename() {
    if (!editing || disabled || busyId) return;
    const title = editing.title.trim();
    if (!title) {
      setError('Le titre ne peut pas être vide.');
      return;
    }
    setBusyId(editing.id);
    setError('');
    try {
      const response = await fetch('/api/admin-v2/sproutvideo/' + encodeURIComponent(editing.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(kind ? { kind, title } : { title }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) throw new Error(body?.error?.message || 'Renommage impossible.');
      const updated = body.data as SproutVideo;
      setData(current => current ? {
        ...current,
        items: current.items.map(video => video.id === updated.id ? updated : video),
      } : current);
      setEditing(null);
      setMessage('Titre mis à jour dans SproutVideo.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Renommage impossible.');
    } finally {
      setBusyId('');
    }
  }

  async function savePoster(video: SproutVideo, index: number) {
    if (disabled || busyId || index === video.posterFrameIndex) {
      setPosterFor('');
      return;
    }
    setBusyId(video.id);
    setError('');
    try {
      const response = await fetch('/api/admin-v2/sproutvideo/' + encodeURIComponent(video.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(kind ? { kind, posterframe_number: index } : { posterframe_number: index }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.success) throw new Error(body?.error?.message || 'Vignette impossible à modifier.');
      const updated = body.data as SproutVideo;
      setData(current => current ? {
        ...current,
        items: current.items.map(item => item.id === updated.id ? updated : item),
      } : current);
      setPosterFor('');
      setMessage('Vignette mise à jour dans SproutVideo.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vignette impossible à modifier.');
    } finally {
      setBusyId('');
    }
  }

  async function remove(video: SproutVideo, force = false) {
    if (disabled || busyId) return;
    if (!force && !await askConfirm('Supprimer définitivement « ' + video.title + ' » de SproutVideo ? Cette action est irréversible.')) return;
    setBusyId(video.id);
    setError('');
    try {
      const params = new URLSearchParams();
      if (kind) params.set('kind', kind);
      if (force) params.set('force', '1');
      const suffix = params.toString() ? '?' + params.toString() : '';
      const response = await fetch('/api/admin-v2/sproutvideo/' + encodeURIComponent(video.id) + suffix, {
        method: 'DELETE',
        cache: 'no-store',
      });
      const body = await response.json().catch(() => null);
      if (response.status === 409 && !force) {
        const usage = Number(body?.error?.details?.usage) || 0;
        const warning = usage
          ? 'Cette vidéo est utilisée par ' + usage + ' contenu(s) du site. Leur lecteur ne fonctionnera plus.'
          : 'La vérification des contenus liés a échoué : cette vidéo peut être utilisée par le site.';
        if (await askConfirm(warning + '\n\nSupprimer quand même ?')) await remove(video, true);
        return;
      }
      if (!response.ok || !body?.success) throw new Error(body?.error?.message || 'Suppression impossible.');
      setData(current => current ? {
        ...current,
        items: current.items.filter(item => item.id !== video.id),
        total: Math.max(0, current.total - 1),
      } : current);
      if (editing?.id === video.id) setEditing(null);
      if ((data?.items.length ?? 0) <= 1 && page > 1) setPage(current => current - 1);
      setMessage('Vidéo supprimée de SproutVideo.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible.');
    } finally {
      setBusyId('');
    }
  }

  return (
    <div className={styles.library + (compact ? ' ' + styles.compact : '')} aria-busy={loading}>
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') event.preventDefault();
            }}
            placeholder="Filtrer les vidéos de cette page…"
            aria-label="Filtrer les vidéos affichées"
            maxLength={100}
          />
        </label>
        <button type="button" className="admin-btn admin-btn-ghost" disabled={loading} onClick={refresh}>
          <RefreshCw size={16} /> Actualiser
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-primary"
          disabled={disabled || uploading}
          aria-expanded={uploadOpen}
          onClick={() => setUploadOpen(open => !open)}
        >
          {uploadOpen ? <X size={16} /> : <Upload size={16} />}
          {uploadOpen ? 'Fermer' : 'Téléverser une vidéo'}
        </button>
      </div>

      {message && <p className={styles.notice} role="status">{message}</p>}
      {error && <p className={styles.alert} role="alert">{error}</p>}

      {processing && (
        <div className={styles.processing} role="status">
          <Loader2 size={18} className={styles.spin} aria-hidden="true" />
          <div>
            <strong>Traitement de « {processing.title} »</strong>
            <span>{sproutStateLabel('processing')} · {processing.progress} %</span>
          </div>
          <progress max={100} value={processing.progress} aria-label="Progression du traitement SproutVideo" />
        </div>
      )}

      {uploadOpen && (
        <div className={styles.upload}>
          <div className={styles.uploadGrid}>
            <label className={styles.field}>
              <span>Fichier vidéo</span>
              <input
                type="file"
                accept="video/*"
                disabled={disabled || uploading}
                onChange={event => {
                  chooseFile(event.target.files?.[0] ?? null);
                  event.target.value = '';
                }}
              />
            </label>
            <label className={styles.field}>
              <span>Titre dans SproutVideo</span>
              <input
                type="text"
                value={uploadTitle}
                onChange={event => setUploadTitle(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void startUpload();
                  }
                }}
                maxLength={200}
                disabled={disabled || uploading}
              />
            </label>
          </div>
          {file && <p className={styles.file}>{file.name} · {formatBytes(file.size)}</p>}
          <div className={styles.uploadActions}>
            <button type="button" className="admin-btn admin-btn-primary" disabled={!file || uploading || disabled} onClick={() => void startUpload()}>
              <Upload size={16} />
              {uploading ? 'Téléversement ' + uploadProgress + ' %' : 'Téléverser vers SproutVideo'}
            </button>
            {uploading ? (
              <button type="button" className="admin-btn admin-btn-ghost" onClick={cancelUpload}>Annuler</button>
            ) : (
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => { setFile(null); setUploadOpen(false); }}>Fermer</button>
            )}
          </div>
          {uploading && <progress max={100} value={uploadProgress} aria-label="Progression du téléversement" />}
          <p className={styles.note}>Envoi direct depuis votre navigateur vers SproutVideo. Formats acceptés selon votre offre, 5 Go maximum.</p>
        </div>
      )}

      {loading && !data ? (
        <p className={styles.loading} role="status">Chargement de la vidéothèque…</p>
      ) : !data?.items.length ? (
        <p className={styles.empty}>
          {query.trim() ? 'Aucune vidéo ne correspond à ce filtre sur cette page.' : 'Aucune vidéo dans la vidéothèque. Téléversez la première.'}
        </p>
      ) : !items.length ? (
        <p className={styles.empty}>Aucune vidéo ne correspond à ce filtre sur cette page.</p>
      ) : (
        <ul className={styles.videos}>
          {items.map(video => (
            <li key={video.id} className={styles.video}>
              <span className={styles.thumb}>
                {video.thumbnailUrl ? <img src={video.thumbnailUrl} alt="" loading="lazy" /> : <Film size={22} aria-hidden="true" />}
              </span>
              <div className={styles.copy}>
                {editing?.id === video.id ? (
                  <div className={styles.rename}>
                    <input
                      type="text"
                      value={editing.title}
                      onChange={event => setEditing(current => current ? { ...current, title: event.target.value } : current)}
                      onKeyDown={event => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void saveRename();
                        }
                        if (event.key === 'Escape') setEditing(null);
                      }}
                      maxLength={200}
                      aria-label={'Nouveau titre pour ' + video.title}
                      autoFocus
                      disabled={busyId === video.id}
                    />
                    <button type="button" className="admin-btn admin-btn-primary" disabled={busyId === video.id} onClick={() => void saveRename()}>Enregistrer</button>
                    <button type="button" className="admin-btn admin-btn-ghost" disabled={busyId === video.id} onClick={() => setEditing(null)}>Annuler</button>
                  </div>
                ) : (
                  <strong>{video.title}</strong>
                )}
                <small>{videoDetails(video)}</small>
                {video.posterFrames.length > 1 && (
                  <div className={styles.poster}>
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost"
                      aria-expanded={posterFor === video.id}
                      disabled={disabled || busyId === video.id || Boolean(editing)}
                      onClick={() => setPosterFor(current => current === video.id ? '' : video.id)}
                    >
                      Vignette {video.posterFrameIndex + 1}/{video.posterFrames.length}
                    </button>
                    {posterFor === video.id && (
                      <div className={styles.posterOptions}>
                        {video.posterFrames.map((src, index) => (
                          <button
                            key={src + index}
                            type="button"
                            aria-label={'Utiliser la vignette ' + (index + 1)}
                            aria-pressed={index === video.posterFrameIndex}
                            disabled={busyId === video.id}
                            onClick={() => void savePoster(video, index)}
                          >
                            <img src={src} alt="" loading="lazy" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {!sproutSelectable(video) && (
                  <span className={styles.badge}>
                    {sproutStateLabel(video.state)}
                    {video.requiresSignedEmbeds ? ' · embeds signés' : ''}
                  </span>
                )}
              </div>
              <div className={styles.actions}>
                {onSelect && (
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    disabled={disabled || busyId === video.id || !sproutSelectable(video)}
                    onClick={() => onSelect(video)}
                  >
                    Choisir
                  </button>
                )}
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost"
                  disabled={disabled || busyId === video.id || Boolean(editing)}
                  onClick={() => startRename(video)}
                  aria-label={'Renommer ' + video.title}
                  title="Renommer"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost"
                  disabled={disabled || busyId === video.id}
                  onClick={() => void remove(video)}
                  aria-label={'Supprimer ' + video.title}
                  title="Supprimer"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && data.total > 0 && (
        <nav className={styles.pages} aria-label="Pagination de la vidéothèque">
          <span>{data.total} vidéo{data.total > 1 ? 's' : ''} · page {page} / {pageCount}</span>
          <div>
            <button type="button" className="admin-btn admin-btn-ghost" disabled={loading || page <= 1} onClick={() => setPage(current => current - 1)}>Précédent</button>
            <button type="button" className="admin-btn admin-btn-ghost" disabled={loading || page >= pageCount} onClick={() => setPage(current => current + 1)}>Suivant</button>
          </div>
        </nav>
      )}

      {!compact && (
        <p className={styles.note}>
          Les vidéos sont hébergées et encodées par SproutVideo. Le téléversement ne passe pas par nos serveurs :
          le navigateur envoie le fichier directement avec un jeton à usage unique.
        </p>
      )}
    </div>
  );
}
