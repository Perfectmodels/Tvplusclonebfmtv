'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
 ArrowRight, BookOpen, CheckCircle2, ExternalLink, Eye, EyeOff, Globe2, Info,
 KeyRound, LockKeyhole, MonitorPlay, Plus, RadioTower, RotateCcw, Save,
 Server, Settings2, ShieldCheck, Trash2,
} from 'lucide-react';
import {
 STREAM_PROVIDERS, LIVE_PLAYER_PLATFORMS, resolveLivePlayback, isVercelOrSitePlaybackUrl,
} from '../../../lib/video/live-platforms';

type Step = 'source' | 'destination' | 'player';
type Direction = 'source' | 'destination';
type Settings = {
 title: string; description: string; standby_message: string;
 player_platform: string; playback_url: string; enabled: boolean;
 starts_at: string | null; ends_at: string | null;
};
type Target = {
 id: string; name: string; provider: string; direction: Direction;
 protocol: 'rtmps' | 'rtmp' | 'srt' | 'whip' | 'platform';
 watch_url: string; enabled: boolean; position: number; notes: string;
 has_endpoint: boolean; has_key: boolean; updated_at?: string;
};
type EditTarget = Omit<Target, 'id' | 'has_endpoint' | 'has_key' | 'updated_at'> & {
 endpoint: string; stream_key: string; clear_endpoint: boolean; clear_key: boolean;
};
type ApiResponse<T> = { data?: T; error?: { message?: string; details?: { fieldErrors?: Record<string, string[]> } } };

const initial: Settings = {
 title: 'TV+ Afrique en direct', description: '',
 standby_message: 'Le direct reprendra prochainement.',
 player_platform: 'hls', playback_url: '', enabled: false, starts_at: null, ends_at: null,
};
const blank: EditTarget = {
 name: '', provider: 'restream', direction: 'source', protocol: 'rtmps',
 watch_url: '', enabled: true, position: 0, notes: '',
 endpoint: '', stream_key: '', clear_endpoint: false, clear_key: false,
};
const socialProviders = new Set([
 'youtube', 'facebook', 'instagram', 'tiktok', 'twitch', 'linkedin',
 'x', 'dailymotion', 'vimeo', 'kick', 'custom', 'restream',
]);
const fromTarget = (t: Target): EditTarget => ({
 name: t.name, provider: t.provider, direction: t.direction,
 protocol: t.protocol, watch_url: t.watch_url, enabled: t.enabled,
 position: t.position, notes: t.notes, endpoint: '', stream_key: '',
 clear_endpoint: false, clear_key: false,
});
const local = (s: string | null) => s
 ? new Date(s).toLocaleString('sv-SE', { timeZone: 'Africa/Libreville' }).replace(' ', 'T').slice(0, 16)
 : '';
const utc = (s: string) => s ? new Date(s + ':00+01:00').toISOString() : null;
const providerName = (p: string) => STREAM_PROVIDERS.find(x => x.id === p)?.label ?? p;
const docs = {
 obs: 'https://support.restream.io/en/articles/111656-connect-obs-to-restream',
 channels: 'https://support.restream.io/en/articles/10053865-how-to-add-and-enable-your-channels',
 embed: 'https://support.restream.io/en/articles/4996608-stream-to-your-website',
};

function fieldError<T>(body: ApiResponse<T>, fallback: string) {
 const first = Object.values(body.error?.details?.fieldErrors || {}).flat().find(Boolean);
 return first || body.error?.message || fallback;
}

export default function RegieDirect() {
 const [settings, setSettings] = useState<Settings>(initial);
 const [targets, setTargets] = useState<Target[]>([]);
 const [step, setStep] = useState<Step>('source');
 const [editing, setEditing] = useState<string | null>(null);
 const [form, setForm] = useState<EditTarget>(blank);
 const [openForm, setOpenForm] = useState(false);
 const [showSecret, setShowSecret] = useState(false);
 const [busy, setBusy] = useState(false);
 const [loading, setLoading] = useState(true);
 const [message, setMessage] = useState('');
 const [error, setError] = useState('');

 const load = useCallback(async () => {
  // Une erreur du coffre-fort ne doit pas masquer la configuration du lecteur public.
  const [settingsResult, targetsResult] = await Promise.allSettled([
   fetch('/api/admin-v2/live', { cache: 'no-store' }).then(async r => ({
    ok: r.ok, body: await r.json() as ApiResponse<Settings>,
   })),
   fetch('/api/admin-v2/live/targets', { cache: 'no-store' }).then(async r => ({
    ok: r.ok, body: await r.json() as ApiResponse<{ items: Target[] }>,
   })),
  ]);
  const failures: string[] = [];
  if (settingsResult.status === 'fulfilled' && settingsResult.value.ok && settingsResult.value.body.data) {
   setSettings({ ...initial, ...settingsResult.value.body.data });
  } else {
   failures.push('Impossible de charger les paramètres du lecteur.');
  }
  if (targetsResult.status === 'fulfilled' && targetsResult.value.ok) {
   setTargets(targetsResult.value.body.data?.items || []);
  } else {
   failures.push('Profils et clés indisponibles : vérifiez la configuration serveur Supabase.');
  }
  if (failures.length) throw new Error(failures.join(' '));
 }, []);

 useEffect(() => {
  void load().catch(e => setError(e instanceof Error ? e.message : 'Régie indisponible.'))
   .finally(() => setLoading(false));
 }, [load]);

 const current = useMemo(
  () => resolveLivePlayback(settings.player_platform, settings.playback_url),
  [settings.player_platform, settings.playback_url],
 );
 const sourceProfiles = targets.filter(t => t.direction === 'source');
 const destinationProfiles = targets.filter(t => t.direction === 'destination');
 const rows = step === 'destination' ? destinationProfiles : sourceProfiles;
 const selectedTarget = editing ? targets.find(t => t.id === editing) : null;
 const isExternal = Boolean(current.hlsUrl || current.embedUrl)
  && !isVercelOrSitePlaybackUrl(settings.playback_url);

 const field = <K extends keyof Settings>(key: K, value: Settings[K]) => {
  setSettings(prev => ({ ...prev, [key]: value })); setMessage('');
 };
 const edit = <K extends keyof EditTarget>(key: K, value: EditTarget[K]) => {
  setForm(prev => ({ ...prev, [key]: value })); setMessage('');
 };
 const clearEdit = () => {
  setEditing(null); setOpenForm(false); setShowSecret(false);
  setForm({ ...blank, direction: step === 'destination' ? 'destination' : 'source' });
 };
 function chooseStep(next: Step) {
  setStep(next); setEditing(null); setOpenForm(false); setShowSecret(false);
  setMessage(''); setError('');
 }
 function beginAdd(direction: Direction) {
  setStep(direction); setEditing(null); setOpenForm(true); setShowSecret(false);
  setForm({
   ...blank, direction, provider: direction === 'source' ? 'restream' : 'youtube',
   protocol: direction === 'source' ? 'rtmps' : 'platform',
  });
  setMessage(''); setError('');
 }
 function beginEdit(target: Target) {
  setStep(target.direction); setEditing(target.id); setForm(fromTarget(target));
  setOpenForm(true); setShowSecret(false); setMessage(''); setError('');
 }
 function changeProvider(provider: string) {
  setForm(prev => ({
   ...prev, provider,
   protocol: prev.direction === 'destination'
    ? (provider === 'custom' ? 'rtmps' : 'platform')
    : (prev.protocol === 'platform' ? 'rtmps' : prev.protocol),
  }));
  setMessage('');
 }

 async function saveSettings(event: FormEvent<HTMLFormElement>) {
  event.preventDefault(); setBusy(true); setMessage(''); setError('');
  try {
   const response = await fetch('/api/admin-v2/live', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
   });
   const body = await response.json() as ApiResponse<Settings>;
   if (!response.ok || !body.data) throw new Error(fieldError(body, 'Lecteur invalide.'));
   setSettings({ ...initial, ...body.data });
   setMessage('Le lecteur public est enregistré. Vérifiez ensuite la diffusion sur la page Direct.');
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Erreur réseau.');
  } finally { setBusy(false); }
 }

 async function saveTarget(event: FormEvent<HTMLFormElement>) {
  event.preventDefault(); setBusy(true); setMessage(''); setError('');
  try {
   const response = await fetch('/api/admin-v2/live/targets', {
    method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...form, ...(editing ? { id: editing } : {}) }),
   });
   const body = await response.json() as ApiResponse<{ id: string }>;
   if (!response.ok) throw new Error(fieldError(body, 'Profil invalide.'));
   clearEdit();
   await load();
   setMessage('Profil enregistré. Les éventuels secrets sont conservés dans Supabase Vault.');
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Erreur réseau.');
  } finally { setBusy(false); }
 }

 async function removeTarget(id: string) {
  if (!window.confirm('Supprimer définitivement ce profil et ses secrets associés ?')) return;
  setBusy(true); setMessage(''); setError('');
  try {
   const response = await fetch('/api/admin-v2/live/targets', {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
   });
   const body = await response.json() as ApiResponse<{ deleted: boolean }>;
   if (!response.ok) throw new Error(fieldError(body, 'Suppression refusée.'));
   await load();
   if (editing === id) clearEdit();
   setMessage('Profil supprimé.');
  } catch (e) {
   setError(e instanceof Error ? e.message : 'Erreur réseau.');
  } finally { setBusy(false); }
 }

 return <div className="v2-regie live-studio live-regie-v3">
  <header className="v2-head">
   <div>
    <p className="v2-newsroom-eyebrow">TV+ AFRIQUE · RÉGIE DU DIRECT</p>
    <h1 className="v2-title">Configurer la diffusion</h1>
    <p className="v2-lede">Un parcours clair, de la régie OBS jusqu'au lecteur visible par les spectateurs.</p>
   </div>
   <Link href="/direct" target="_blank" className="admin-btn admin-btn-ghost">
    <ExternalLink size={16}/> Voir le direct
   </Link>
  </header>

  <nav className="live-regie-steps" aria-label="Étapes de configuration">
   <button type="button" className={'live-regie-step' + (step === 'source' ? ' is-active' : '')}
    aria-current={step === 'source' ? 'step' : undefined} onClick={() => chooseStep('source')}>
    <span className="live-regie-step-num">01</span>
    <span><strong>Source du signal</strong><small>OBS → Restream</small></span>
    <span className="live-regie-step-count">{sourceProfiles.length}</span>
   </button>
   <button type="button" className={'live-regie-step' + (step === 'destination' ? ' is-active' : '')}
    aria-current={step === 'destination' ? 'step' : undefined} onClick={() => chooseStep('destination')}>
    <span className="live-regie-step-num">02</span>
    <span><strong>Destinations</strong><small>YouTube, Facebook…</small></span>
    <span className="live-regie-step-count">{destinationProfiles.length}</span>
   </button>
   <button type="button" className={'live-regie-step' + (step === 'player' ? ' is-active' : '')}
    aria-current={step === 'player' ? 'step' : undefined} onClick={() => chooseStep('player')}>
    <span className="live-regie-step-num">03</span>
    <span><strong>Lecteur TV+</strong><small>{settings.enabled ? 'Affichage activé' : 'En attente'}</small></span>
    {settings.enabled && <CheckCircle2 size={18} aria-label="Lecteur activé"/>}
   </button>
  </nav>

  {error && <div className="v2-error" role="alert">{error}</div>}
  {message && <div className="v2-success" role="status">{message}</div>}
  {loading ? <div className="v2-card">Chargement des configurations…</div> : <>
   {step === 'source' && <section className="v2-card live-regie-panel" aria-labelledby="regie-source-title">
    <div className="live-regie-panel-head">
     <span className="live-regie-panel-icon"><RadioTower size={23}/></span>
     <div>
      <p className="live-regie-kicker">ÉTAPE 01 · ENTRÉE DU SIGNAL</p>
      <h2 id="regie-source-title">Connecter OBS ou vMix à Restream</h2>
      <p>Restream reçoit le son et l'image de votre régie. TV+ Afrique n'est pas le serveur d'ingestion.</p>
     </div>
    </div>
    <div className="live-regie-guide">
     <div className="live-regie-guide-title"><BookOpen size={18}/> Configuration recommandée</div>
     <ol>
      <li><strong>Dans Restream :</strong> créez un flux « Encoder / RTMP ».</li>
      <li><strong>Dans OBS :</strong> choisissez le service Restream et connectez votre compte, ou utilisez l'adresse du serveur et la clé du flux.</li>
      <li><strong>Dans TV+ :</strong> gardez une fiche technique uniquement si vous souhaitez documenter cette source pour votre équipe.</li>
     </ol>
     <div className="live-regie-inline-actions">
      <a href="https://restream.io/" target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-ghost">Ouvrir Restream <ExternalLink size={15}/></a>
      <a href={docs.obs} target="_blank" rel="noopener noreferrer">Guide OBS officiel <ArrowRight size={14}/></a>
     </div>
    </div>
    <div className="live-regie-list-head">
     <div><h3>Sources enregistrées</h3><p>Ces fiches ne démarrent pas le flux dans Restream.</p></div>
     <button type="button" className="admin-btn admin-btn-ghost" disabled={busy}
      onClick={() => void load().catch(e => setError(e.message))}><RotateCcw size={15}/> Actualiser</button>
    </div>
    <div className="v2-regie-channels live-studio-targets">
     {rows.map(t => <div className="v2-regie-channel" key={t.id}>
      <div>
       <strong>{t.name}</strong>
       <span>{providerName(t.provider)} · {t.protocol.toUpperCase()} · {t.enabled ? 'Fiche active' : 'Fiche inactive'}</span>
       <small><LockKeyhole size={13}/> Adresse {t.has_endpoint ? 'protégée' : 'non enregistrée'} · Clé {t.has_key ? 'protégée' : 'non enregistrée'}</small>
      </div>
      <div className="v2-actions">
       <button type="button" className="admin-btn admin-btn-ghost" disabled={busy} onClick={() => beginEdit(t)}>Modifier</button>
       <button type="button" className="admin-btn admin-btn-ghost" disabled={busy} onClick={() => void removeTarget(t.id)} aria-label={'Supprimer ' + t.name}><Trash2 size={15}/></button>
      </div>
     </div>)}
     {!rows.length && <div className="live-regie-empty"><Server size={22}/><strong>Aucune fiche technique enregistrée</strong><span>Tu peux quand même connecter OBS directement à Restream.</span></div>}
    </div>
    {!openForm && <button type="button" className="admin-btn admin-btn-primary live-studio-add" onClick={() => beginAdd('source')}>
     <Plus size={16}/> Ajouter une source
    </button>}
    {openForm && <form className="live-studio-form live-regie-form" onSubmit={saveTarget} autoComplete="off">
     <div className="v2-regie-section-head"><h3>{editing ? 'Modifier la source' : 'Nouvelle source'}</h3>
      <button className="admin-btn admin-btn-ghost" type="button" onClick={clearEdit}>Annuler</button></div>
     <div className="v2-regie-times">
      <label className="v2-field"><span>Nom de la source *</span>
       <input required minLength={2} maxLength={120} value={form.name} placeholder="Ex. Régie TV+ — OBS principal"
        onChange={e => edit('name', e.target.value)}/></label>
      <label className="v2-field"><span>Protocole d'émission</span>
       <select value={form.protocol} onChange={e => edit('protocol', e.target.value as EditTarget['protocol'])}>
        <option value="rtmps">RTMPS · recommandé</option><option value="rtmp">RTMP</option>
        <option value="srt">SRT</option><option value="whip">WHIP</option>
        {form.protocol === 'platform' && <option value="platform">Connexion par plateforme</option>}
       </select>
      </label>
     </div>
     <div className="live-regie-hint"><Info size={16}/> Si OBS est connecté au compte Restream, il n'est pas nécessaire de recopier la clé ici.</div>
     <div className="v2-regie-times">
      <label className="v2-field"><span>Adresse du serveur Restream</span>
       <input type="text" inputMode="url" maxLength={2500} spellCheck={false}
        placeholder={selectedTarget?.has_endpoint ? 'Adresse déjà protégée — laisser vide pour conserver' : form.protocol === 'srt' ? 'srt://…' : form.protocol === 'whip' ? 'https://…' : 'rtmps://…'}
        value={form.endpoint} onChange={e => edit('endpoint', e.target.value)}/>
       {selectedTarget?.has_endpoint && <label className="live-studio-clear">
        <input type="checkbox" checked={form.clear_endpoint} onChange={e => edit('clear_endpoint', e.target.checked)}/> Effacer l'adresse sauvegardée
       </label>}
      </label>
      <label className="v2-field"><span><KeyRound size={14}/> Clé de stream (facultative)</span>
       <div className="live-studio-key-input">
        <input type={showSecret ? 'text' : 'password'} maxLength={2500} autoComplete="new-password"
         placeholder={selectedTarget?.has_key ? 'Clé protégée — laisser vide pour conserver' : 'Clé fournie par Restream'}
         value={form.stream_key} onChange={e => edit('stream_key', e.target.value)}/>
        <button type="button" aria-label={showSecret ? 'Masquer la clé' : 'Afficher la clé'} onClick={() => setShowSecret(p => !p)}>
         {showSecret ? <EyeOff size={18}/> : <Eye size={18}/>}
        </button>
       </div>
       {selectedTarget?.has_key && <label className="live-studio-clear">
        <input type="checkbox" checked={form.clear_key} onChange={e => edit('clear_key', e.target.checked)}/> Effacer la clé sauvegardée
       </label>}
      </label>
     </div>
     <details className="live-regie-advanced">
      <summary><Settings2 size={15}/> Options avancées de la source</summary>
      <div className="live-regie-advanced-inner">
       <label className="v2-field"><span>Service / encodeur</span><select value={form.provider} onChange={e => changeProvider(e.target.value)}>
        {STREAM_PROVIDERS.filter(p => ['restream','obs','vmix','streamyard','custom','castr','mux','cloudflare','wowza','livepeer'].includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        {!STREAM_PROVIDERS.some(p => p.id === form.provider) && <option value={form.provider}>{form.provider}</option>}
       </select></label>
       <label className="v2-field"><span>Notes</span><textarea rows={2} maxLength={1000} value={form.notes} onChange={e => edit('notes', e.target.value)}/></label>
       <label className="v2-field"><span>Ordre d'affichage</span><input type="number" min={0} max={999} value={form.position} onChange={e => edit('position', Number(e.target.value))}/></label>
       <label className="v2-regie-check"><input type="checkbox" checked={form.enabled} onChange={e => edit('enabled', e.target.checked)}/> Fiche active (ne démarre pas le direct)</label>
      </div>
     </details>
     <p className="live-regie-security"><ShieldCheck size={16}/> Les données privées sont chiffrées dans Supabase Vault. Les secrets déjà enregistrés ne sont jamais réaffichés.</p>
     <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}><Save size={16}/>{busy ? 'Enregistrement…' : 'Enregistrer la source'}</button>
    </form>}
    <div className="live-regie-bottom"><button type="button" className="admin-btn admin-btn-ghost" onClick={() => chooseStep('destination')}>
     Suivant : destinations <ArrowRight size={16}/>
    </button></div>
   </section>}

   {step === 'destination' && <section className="v2-card live-regie-panel" aria-labelledby="regie-destination-title">
    <div className="live-regie-panel-head">
     <span className="live-regie-panel-icon"><Globe2 size={23}/></span>
     <div><p className="live-regie-kicker">ÉTAPE 02 · MULTIDIFFUSION</p>
      <h2 id="regie-destination-title">Choisir les chaînes de diffusion</h2>
      <p>Reliez vos comptes YouTube, Facebook et autres directement dans Restream.</p>
     </div>
    </div>
    <div className="live-regie-hint"><Info size={17}/>
     Les profils ci-dessous sont des références de régie. Pour autoriser et activer réellement une chaîne, utilisez « Channels » dans Restream.
    </div>
    <div className="live-regie-inline-actions live-regie-main-action">
     <a href="https://restream.io/" target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-primary">Gérer mes chaînes sur Restream <ExternalLink size={15}/></a>
     <a href={docs.channels} target="_blank" rel="noopener noreferrer">Comment connecter une destination <ArrowRight size={14}/></a>
    </div>
    <div className="live-regie-list-head">
     <div><h3>Destinations référencées</h3><p>L'état « actif » concerne uniquement la fiche TV+, pas l'état réel du compte Restream.</p></div>
    </div>
    <div className="v2-regie-channels live-studio-targets">
     {rows.map(t => <div className="v2-regie-channel" key={t.id}>
      <div>
       <strong>{t.name}</strong>
       <span>{providerName(t.provider)} · {t.enabled ? 'Fiche active' : 'Fiche inactive'}</span>
       {t.watch_url && <a href={t.watch_url} target="_blank" rel="noopener noreferrer">Voir la chaîne <ExternalLink size={13}/></a>}
       {(t.has_endpoint || t.has_key) && <small><LockKeyhole size={13}/> Connexion personnalisée enregistrée en coffre-fort</small>}
      </div>
      <div className="v2-actions">
       <button type="button" className="admin-btn admin-btn-ghost" onClick={() => beginEdit(t)} disabled={busy}>Modifier</button>
       <button type="button" className="admin-btn admin-btn-ghost" onClick={() => void removeTarget(t.id)} disabled={busy} aria-label={'Supprimer ' + t.name}><Trash2 size={15}/></button>
      </div>
     </div>)}
     {!rows.length && <div className="live-regie-empty"><Globe2 size={22}/><strong>Aucune destination référencée</strong>
      <span>Les destinations déjà configurées chez Restream continuent de fonctionner indépendamment de cette liste.</span></div>}
    </div>
    {!openForm && <button type="button" className="admin-btn admin-btn-primary live-studio-add" onClick={() => beginAdd('destination')}>
     <Plus size={16}/> Référencer une destination
    </button>}
    {openForm && <form className="live-studio-form live-regie-form" onSubmit={saveTarget}>
     <div className="v2-regie-section-head"><h3>{editing ? 'Modifier la destination' : 'Ajouter une destination'}</h3>
      <button type="button" className="admin-btn admin-btn-ghost" onClick={clearEdit}>Annuler</button></div>
     <div className="v2-regie-times">
      <label className="v2-field"><span>Plateforme</span><select value={form.provider} onChange={e => changeProvider(e.target.value)}>
       {STREAM_PROVIDERS.filter(p => socialProviders.has(p.id)).map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
       {!STREAM_PROVIDERS.some(p => p.id === form.provider && socialProviders.has(p.id)) && <option value={form.provider}>{providerName(form.provider)}</option>}
      </select></label>
      <label className="v2-field"><span>Nom du canal *</span><input required minLength={2} maxLength={120}
       placeholder="Ex. YouTube — TV+ Afrique" value={form.name} onChange={e => edit('name', e.target.value)}/></label>
     </div>
     <label className="v2-field"><span>Lien public de la chaîne (facultatif)</span>
      <input type="url" maxLength={1400} placeholder="https://www.youtube.com/@..."
       value={form.watch_url} onChange={e => edit('watch_url', e.target.value)}/>
      <small>Pour ouvrir la chaîne. Ce lien ne crée pas de connexion automatique à Restream.</small></label>
     {(form.provider === 'custom' || selectedTarget?.has_endpoint || selectedTarget?.has_key) && <details className="live-regie-advanced">
      <summary><Settings2 size={15}/> Serveur RTMP personnalisé et anciens paramètres</summary>
      <div className="live-regie-advanced-inner">
       <label className="v2-field"><span>Protocole de destination</span><select value={form.protocol} onChange={e => edit('protocol', e.target.value as EditTarget['protocol'])}>
        <option value="platform">Plateforme connectée sur Restream</option><option value="rtmps">RTMPS</option>
        <option value="rtmp">RTMP</option><option value="srt">SRT</option><option value="whip">WHIP</option>
       </select></label>
       <label className="v2-field"><span>Adresse du serveur (si canal personnalisé)</span>
        <input type="text" value={form.endpoint} maxLength={2500} spellCheck={false}
         placeholder={selectedTarget?.has_endpoint ? 'Adresse sécurisée existante' : 'rtmps://…'}
         onChange={e => edit('endpoint', e.target.value)}/>
        {selectedTarget?.has_endpoint && <label className="live-studio-clear"><input type="checkbox" checked={form.clear_endpoint} onChange={e => edit('clear_endpoint', e.target.checked)}/> Effacer l'adresse</label>}
       </label>
       <label className="v2-field"><span>Clé du canal personnalisé</span>
        <div className="live-studio-key-input">
         <input type={showSecret ? 'text' : 'password'} autoComplete="new-password" maxLength={2500}
          value={form.stream_key} placeholder={selectedTarget?.has_key ? 'Clé sécurisée existante' : 'Clé RTMP'}
          onChange={e => edit('stream_key', e.target.value)}/>
         <button type="button" aria-label={showSecret ? 'Masquer la clé' : 'Afficher la clé'} onClick={() => setShowSecret(p => !p)}>
          {showSecret ? <EyeOff size={18}/> : <Eye size={18}/>}
         </button>
        </div>
        {selectedTarget?.has_key && <label className="live-studio-clear"><input type="checkbox" checked={form.clear_key} onChange={e => edit('clear_key', e.target.checked)}/> Effacer la clé</label>}
       </label>
      </div>
     </details>}
     <details className="live-regie-advanced"><summary><Settings2 size={15}/> Organisation</summary>
      <div className="live-regie-advanced-inner">
       <label className="v2-field"><span>Notes</span><textarea rows={2} maxLength={1000} value={form.notes} onChange={e => edit('notes', e.target.value)}/></label>
       <label className="v2-field"><span>Ordre</span><input type="number" min={0} max={999} value={form.position} onChange={e => edit('position', Number(e.target.value))}/></label>
       <label className="v2-regie-check"><input type="checkbox" checked={form.enabled} onChange={e => edit('enabled', e.target.checked)}/> Fiche active</label>
      </div>
     </details>
     <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}><Save size={16}/>{busy ? 'Enregistrement…' : 'Enregistrer la destination'}</button>
    </form>}
    <div className="live-regie-bottom"><button type="button" className="admin-btn admin-btn-ghost" onClick={() => chooseStep('player')}>
     Suivant : lecteur TV+ <ArrowRight size={16}/>
    </button></div>
   </section>}

   {step === 'player' && <section className="v2-card live-regie-panel" aria-labelledby="regie-player-title">
    <div className="live-regie-panel-head">
     <span className="live-regie-panel-icon"><MonitorPlay size={23}/></span>
     <div><p className="live-regie-kicker">ÉTAPE 03 · DIFFUSION SUR LE SITE</p>
      <h2 id="regie-player-title">Afficher le direct sur TV+ Afrique</h2>
      <p>Ce réglage alimente le lecteur de l'accueil, le mini-lecteur flottant et la page Direct.</p>
     </div>
    </div>
    <div className="live-regie-player-grid">
     <form onSubmit={saveSettings} className="live-regie-player-form">
      <div className="live-regie-field-title">Choisir la source de lecture</div>
      <div className="live-regie-player-choice" role="group" aria-label="Type de lecteur">
       <button type="button" aria-pressed={settings.player_platform === 'restream'}
        className={settings.player_platform === 'restream' ? 'is-active' : ''}
        onClick={() => field('player_platform', 'restream')}>Lecteur Restream</button>
       <button type="button" aria-pressed={settings.player_platform === 'hls'}
        className={settings.player_platform === 'hls' ? 'is-active' : ''}
        onClick={() => field('player_platform', 'hls')}>Flux HLS externe</button>
       <button type="button" aria-pressed={settings.player_platform === 'youtube'}
        className={settings.player_platform === 'youtube' ? 'is-active' : ''}
        onClick={() => field('player_platform', 'youtube')}>YouTube Live</button>
      </div>
      {settings.player_platform === 'restream' && <div className="live-regie-hint">
       <Info size={17}/> Dans Restream, ajoutez le canal « Embed Player », activez-le dans le flux et copiez son code iframe ici. Ce lecteur nécessite l'offre Business ou Enterprise.
      </div>}
      {settings.player_platform === 'hls' && <div className="live-regie-hint">
       <Info size={17}/> Collez une adresse HTTPS se terminant par .m3u8, fournie par votre CDN vidéo. Le navigateur téléchargera les segments directement chez le diffuseur.
      </div>}
      <label className="v2-field"><span>URL de lecture publique {settings.player_platform === 'restream' ? 'ou code iframe Restream' : ''} *</span>
       <textarea rows={3} maxLength={3500} required={settings.enabled} spellCheck={false}
        placeholder={settings.player_platform === 'restream'
         ? '<iframe src="https://player.restream.io/..."></iframe>'
         : settings.player_platform === 'hls' ? 'https://cdn-video.example.com/live/master.m3u8' : 'https://www.youtube.com/live/...'}
        value={settings.playback_url} onChange={e => field('playback_url', e.target.value)}/>
       <small>Adresse de visionnage uniquement. Ne collez jamais un serveur RTMP, une clé privée ou une URL WHIP.</small>
      </label>
      {settings.playback_url && <p className={'live-regie-validation' + (isExternal ? ' is-valid' : '')}>
       {isVercelOrSitePlaybackUrl(settings.playback_url)
        ? 'Adresse refusée : la vidéo ne doit pas transiter par Vercel.'
        : isExternal ? 'Lecteur externe reconnu : prêt à être enregistré (lecture réelle à tester).'
        : 'Lien non compatible avec le type de lecteur sélectionné.'}
      </p>}
      <div className="v2-regie-times">
       <label className="v2-field"><span>Titre affiché</span><input required minLength={3} maxLength={120}
        value={settings.title} onChange={e => field('title', e.target.value)}/></label>
       <label className="v2-field"><span>Message hors antenne</span><input maxLength={350}
        value={settings.standby_message} onChange={e => field('standby_message', e.target.value)}/></label>
      </div>
      <label className="v2-field"><span>Description (facultative)</span><textarea rows={2} maxLength={1200}
       value={settings.description} onChange={e => field('description', e.target.value)}/></label>
      <details className="live-regie-advanced"><summary><Settings2 size={15}/> Autres lecteurs et programmation</summary>
       <div className="live-regie-advanced-inner">
        <label className="v2-field"><span>Autre type de lecteur</span><select value={settings.player_platform}
         onChange={e => field('player_platform', e.target.value)}>
         {LIVE_PLAYER_PLATFORMS.map(p => <option key={p[0]} value={p[0]}>{p[1]}</option>)}
        </select></label>
        <div className="v2-regie-times">
         <label className="v2-field"><span>Début d'affichage · Libreville</span>
          <input type="datetime-local" value={local(settings.starts_at)} onChange={e => field('starts_at', utc(e.target.value))}/></label>
         <label className="v2-field"><span>Fin d'affichage · Libreville</span>
          <input type="datetime-local" value={local(settings.ends_at)} onChange={e => field('ends_at', utc(e.target.value))}/></label>
        </div>
       </div>
      </details>
      <label className="live-regie-publish"><input type="checkbox" checked={settings.enabled}
       onChange={e => field('enabled', e.target.checked)}/>
       <span><strong>Afficher le lecteur sur TV+ Afrique</strong><small>L'activation affiche le lecteur, mais ne lance pas Restream.</small></span>
      </label>
      <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>
       <Save size={16}/>{busy ? 'Enregistrement…' : 'Enregistrer le lecteur TV+'}
      </button>
     </form>
     <aside className="live-regie-preview-column">
      <div className="live-regie-field-title">Aperçu du lecteur</div>
      <div className="v2-regie-preview">
       {current.embedUrl && isExternal
        ? <iframe src={current.embedUrl} title="Prévisualisation de la source externe"
         allow="autoplay; fullscreen; picture-in-picture" allowFullScreen
         referrerPolicy="strict-origin-when-cross-origin" style={{ width: '100%', aspectRatio: '16 / 9' }}/>
        : <div><MonitorPlay size={32}/><strong>{current.hlsUrl && isExternal ? 'Flux HLS identifié' : 'Lecteur non configuré'}</strong>
         <p>{current.hlsUrl && isExternal ? 'Pour vérifier la lecture HLS, ouvrez la page Direct.' : 'Ajoutez un lien de lecture compatible.'}</p></div>}
      </div>
      <Link className="admin-btn admin-btn-ghost" href="/direct" target="_blank">
       <ExternalLink size={15}/> Vérifier la diffusion publique
      </Link>
      <div className="live-regie-player-advice">
       <strong><ShieldCheck size={16}/> Important pour l'audience</strong>
       <p>Le lecteur Restream « Embed Player » est disponible sur les offres Business et Enterprise. L'offre Business annonce jusqu'à 1 000 spectateurs simultanés et une latence pouvant atteindre 60 secondes.</p>
       <p>Pour une audience supérieure, prévoir un CDN vidéo dimensionné pour TV+ Afrique.</p>
       <a href={docs.embed} target="_blank" rel="noopener noreferrer">Documentation Restream Embed Player <ExternalLink size={13}/></a>
      </div>
     </aside>
    </div>
   </section>}
  </>}
  <div className="live-regie-footer-note"><ShieldCheck size={16}/> Les clés d'émission restent privées. Restream assure l'envoi vers ses canaux ; TV+ Afrique affiche seulement le lecteur public.</div>
 </div>;
}
