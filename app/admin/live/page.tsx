'use client';

import { useEffect, useState } from 'react';
import { Radio, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '../../../components/admin/ToastProvider';

type Provider = {
  provider: string; label: string; rtmpUrl: string; keyMasked: string;
  hasKey: boolean; enabled: boolean; instructions: string;
};

export default function AdminLivePage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const { success, error } = useToast();

  function load() {
    fetch('/api/admin/stream-settings').then((r) => r.json()).then((b) => {
      const items: Provider[] = b.data ?? [];
      setProviders(items);
      setUrls(Object.fromEntries(items.map((p) => [p.provider, p.rtmpUrl])));
    }).catch(() => {});
  }
  useEffect(load, []);

  async function save(provider: Provider) {
    setSaving(provider.provider);
    try {
      const response = await fetch('/api/admin/stream-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: provider.provider,
          rtmpUrl: urls[provider.provider] ?? provider.rtmpUrl,
          streamKey: keys[provider.provider] || undefined,
          enabled: !provider.enabled,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Enregistrement impossible.');
      success(provider.enabled ? 'Diffuseur désactivé.' : 'Diffuseur activé.');
      setKeys((k) => ({ ...k, [provider.provider]: '' }));
      load();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Erreur.');
    } finally { setSaving(null); }
  }

  async function copyUrl(url: string) {
    try { await navigator.clipboard.writeText(url); success('URL RTMP copiée.'); }
    catch { error('Copie impossible.'); }
  }

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div><h2>Diffusion en direct</h2><p>Configurez les outils externes (OBS, Restream…) autorisés à diffuser sur TV Plus.</p></div>
      </div>

      <div className="admin-notice">
        <Radio size={18} />
        <p>
          Le lecteur public utilise la variable <code>LIVE_STREAM_URL</code> (flux HLS). Renseignez-la
          dans <code>.env</code> avec l’URL de votre flux pour que le direct soit visible sur le site.
          La clé de flux ci-dessous ne doit jamais être partagée.
        </p>
      </div>

      <div className="stream-grid">
        {providers.map((provider) => (
          <section className={'stream-card' + (provider.enabled ? ' is-enabled' : '')} key={provider.provider}>
            <div className="stream-card-head">
              <h3>{provider.label}</h3>
              <span className={'admin-badge ' + (provider.enabled ? 'status-published' : 'status-draft')}>
                {provider.enabled ? 'Activé' : 'Désactivé'}
              </span>
            </div>
            <p className="stream-instructions">{provider.instructions}</p>
            <label><span>URL RTMP / serveur</span>
              <div className="stream-row">
                <input value={urls[provider.provider] ?? ''} onChange={(e) => setUrls((u) => ({ ...u, [provider.provider]: e.target.value }))} placeholder="rtmp://…" />
                <button type="button" className="admin-icon-btn" onClick={() => copyUrl(urls[provider.provider] ?? '')} aria-label="Copier l’URL"><Copy size={15} /></button>
              </div>
            </label>
            <label><span>Clé de flux {provider.hasKey ? `(${provider.keyMasked})` : ''}</span>
              <input type="password" value={keys[provider.provider] ?? ''} onChange={(e) => setKeys((k) => ({ ...k, [provider.provider]: e.target.value }))} placeholder={provider.hasKey ? 'Remplacer la clé' : 'Nouvelle clé de flux'} autoComplete="new-password" />
            </label>
            <button type="button" className="admin-btn admin-btn-primary" onClick={() => save(provider)} disabled={saving === provider.provider}>
              {saving === provider.provider ? 'Enregistrement…' : provider.enabled ? 'Désactiver' : 'Activer ce diffuseur'}
            </button>
          </section>
        ))}
      </div>

      <p className="photo-credit"><a href="/direct" target="_blank" rel="noopener noreferrer">Voir le direct public <ExternalLink size={13} /></a></p>
    </div>
  );
}
