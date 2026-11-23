'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
 ArrowUpRight, CheckCircle2, CircleAlert, ExternalLink, Link2, LoaderCircle,
 MonitorPlay, Radio, RefreshCw, ShieldCheck, Unplug, Users, Video,
} from 'lucide-react';
import { resolveLivePlayback } from '../../../lib/video/live-platforms';

type Channel = { id: number; name: string; url: string };
type Account = {
 configured: boolean; connected: boolean; account?: string; warning?: string; channels: Channel[];
 embedPlayerUrl?: string; hasEmbedChannel?: boolean; youtubeLiveUrl?: string;
 liveEventTitle?: string; inProgressCount?: number;
};
type Settings = {
 title: string; description: string; standby_message: string;
 player_platform: string; playback_url: string; enabled: boolean;
 starts_at: string | null; ends_at: string | null;
};
type ApiResponse<T> = { data?: T; error?: { message?: string; details?: { fieldErrors?: Record<string,string[]> } } };

const api = '/api/admin-v2/restream';
const callback = 'https://tvplusclonebfmtv.vercel.app/api/admin-v2/restream/callback';

export default function RegieDirect() {
 const [account, setAccount] = useState<Account | null>(null);
 const [settings, setSettings] = useState<Settings | null>(null);
 const [playerCode, setPlayerCode] = useState('');
 const [playerEnabled, setPlayerEnabled] = useState(false);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');

 const reload = useCallback(async () => {
  const results = await Promise.allSettled([
   fetch(api, { cache:'no-store' }).then(async response => {
    const body = await response.json() as ApiResponse<Account>;
    if (!response.ok || !body.data) throw new Error(body.error?.message || 'Connexion Restream indisponible.');
    return body.data;
   }),
   fetch('/api/admin-v2/live', { cache:'no-store' }).then(async response => {
    const body = await response.json() as ApiResponse<Settings>;
    if (!response.ok || !body.data) throw new Error(body.error?.message || 'Lecteur TV+ indisponible.');
    return body.data;
   }),
  ]);
  if (results[0].status === 'fulfilled') setAccount(results[0].value);
  if (results[1].status === 'fulfilled') {
   const data = results[1].value;
   setSettings(data);
   setPlayerCode(['restream','youtube'].includes(data.player_platform) ? data.playback_url : '');
   setPlayerEnabled(['restream','youtube'].includes(data.player_platform) && data.enabled);
  }
  const failures = results.filter(x=>x.status === 'rejected') as PromiseRejectedResult[];
  if (failures.length) throw new Error(failures.map(x => x.reason instanceof Error ? x.reason.message : 'Erreur réseau.').join(' '));
 }, []);

 useEffect(() => {
  const feedback = new URLSearchParams(window.location.search).get('restream');
  if (feedback === 'connected') setSuccess('Compte Restream connecté avec succès.');
  if (feedback === 'setup') setError('La connexion Restream doit être activée dans les paramètres serveur.');
  if (feedback === 'cancelled') setError('Connexion Restream annulée ou session expirée.');
  if (feedback === 'storage-error') setError('Impossible de sauvegarder la connexion Restream.');
  if (feedback === 'error') setError('La connexion Restream a échoué. Réessayez.');
  void reload().catch(e => setError(e instanceof Error ? e.message : 'Régie indisponible.'))
   .finally(() => setLoading(false));
 }, [reload]);

 const preview = resolveLivePlayback(playerCode.includes('player.restream.io')?'restream':'youtube',playerCode);
 const validPlayer = Boolean(preview.embedUrl);

 async function savePlayer(event: FormEvent<HTMLFormElement>) {
  event.preventDefault(); if (!settings) return;
  setSaving(true); setError(''); setSuccess('');
  try {
   if (playerEnabled && !validPlayer) throw new Error('Collez un lien valide vers la vidéo YouTube Live diffusée depuis Restream.');
   const response = await fetch('/api/admin-v2/live', {
    method:'PATCH', headers:{ 'Content-Type':'application/json' },
    body:JSON.stringify({
     ...settings, title:'TV+ Afrique en direct', description:'Diffusion TV+ Afrique depuis Restream.',
     player_platform:playerCode.includes('player.restream.io')?'restream':'youtube', playback_url:playerCode.trim(), enabled:playerEnabled,
     starts_at:null, ends_at:null,
    }),
   });
   const body = await response.json() as ApiResponse<Settings>;
   if (!response.ok || !body.data) {
    const field = Object.values(body.error?.details?.fieldErrors || {}).flat().find(Boolean);
    throw new Error(field || body.error?.message || 'Enregistrement impossible.');
   }
   setSettings(body.data); setSuccess('Lecteur enregistré. Le signal provient de Restream.');
  } catch(e) { setError(e instanceof Error ? e.message : 'Erreur de réseau.'); }
  finally { setSaving(false); }
 }

 async function activateLive(mode:'youtube'|'restream'='youtube') {
  setSaving(true);setError('');setSuccess('');
  try {
   const response=await fetch('/api/admin-v2/restream/activate',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({mode}),
   });
   const body=await response.json() as ApiResponse<{enabled:boolean}>;
   if(!response.ok)throw new Error(body.error?.message || 'Impossible d’activer le lecteur.');
   await reload();
   setSuccess('Le lecteur est maintenant publié sur TV+ Afrique. Le signal est produit dans Restream.');
  } catch(e) {setError(e instanceof Error?e.message:'Erreur de réseau.');}
  finally {setSaving(false);}
 }

 async function disconnect() {
  if (!window.confirm('Déconnecter Restream de la régie TV+ Afrique ? Le flux public déjà enregistré ne sera pas modifié.')) return;
  setSaving(true); setError(''); setSuccess('');
  try {
   const response = await fetch(api, { method:'DELETE', headers:{ 'Content-Type':'application/json' } });
   const body = await response.json() as ApiResponse<{disconnected:boolean}>;
   if (!response.ok) throw new Error(body.error?.message || 'Déconnexion impossible.');
   await reload(); setSuccess('Compte Restream déconnecté.'); 
  } catch(e) { setError(e instanceof Error ? e.message : 'Erreur réseau.'); }
  finally { setSaving(false); }
 }

 return <div className="v2-regie restream-simple">
  <header className="v2-head">
   <div>
    <p className="v2-newsroom-eyebrow">TV+ AFRIQUE · DIFFUSION</p>
    <h1 className="v2-title">Restream</h1>
    <p className="v2-lede">Connectez votre compte Restream pour gérer les chaînes du direct depuis TV+ Afrique.</p>
   </div>
   <Link href="/direct" className="admin-btn admin-btn-ghost" target="_blank">
    Voir le direct <ExternalLink size={16}/>
   </Link>
  </header>
  {error && <div className="v2-error" role="alert"><CircleAlert size={16}/> {error}</div>}
  {success && <div className="v2-success" role="status"><CheckCircle2 size={16}/> {success}</div>}

  <section className="v2-card restream-account-panel" aria-labelledby="restream-account-title">
   <div className="restream-account-head">
    <div className="restream-brand-icon"><Radio size={25}/></div>
    <div className="restream-account-heading">
     <h2 id="restream-account-title">Votre compte Restream</h2>
     <p>Une seule connexion sécurisée. Pas de serveur RTMP ni de clé à saisir dans cette interface.</p>
    </div>
    {account?.connected && <span className="restream-connected"><CheckCircle2 size={15}/> Connecté</span>}
   </div>
   {loading ? <div className="restream-center"><LoaderCircle className="restream-spin" size={24}/> Vérification du compte…</div>
    : account?.connected ? <>
      <div className="restream-profile">
       <span className="restream-profile-avatar"><Users size={21}/></span>
       <div><strong>{account.account || 'Compte Restream'}</strong><small>Compte autorisé à consulter les chaînes</small></div>
      </div>
      {account.warning && <p className="restream-help-warning"><CircleAlert size={15}/> {account.warning}</p>}
      <div className="restream-actions">
       <a href="https://restream.io/" target="_blank" rel="noopener noreferrer" className="admin-btn admin-btn-primary">
        Ouvrir Restream <ExternalLink size={16}/>
       </a>
       <button type="button" className="admin-btn admin-btn-ghost" onClick={() => {setLoading(true);void reload().catch(e=>setError(e.message)).finally(()=>setLoading(false));}}>
        <RefreshCw size={15}/> Actualiser
       </button>
       <button type="button" className="admin-btn admin-btn-ghost" onClick={() => void disconnect()} disabled={saving}>
        <Unplug size={15}/> Déconnecter
       </button>
      </div>
     </>
    : <>
      <div className="restream-connection-intro">
       <p>Autorisez TV+ Afrique à accéder à votre compte Restream. Vos identifiants ne sont jamais demandés ni enregistrés par notre site.</p>
       {account?.configured ?
        <a className="admin-btn admin-btn-primary restream-connect" href="/api/admin-v2/restream/connect">
         <Link2 size={18}/> Connecter mon compte Restream <ArrowUpRight size={16}/>
        </a>
       : <div className="restream-setup">
         <p><strong>Activation initiale requise.</strong> Créez une application Restream et configurez ses identifiants OAuth côté serveur pour activer le bouton de connexion.</p>
         <a href="https://developers.restream.io/apps" target="_blank" rel="noopener noreferrer">
          Créer une application Restream <ExternalLink size={14}/>
         </a>
         <p className="restream-setup-callback">Adresse de retour à enregistrer dans Restream : <code>{callback}</code></p>
         <p>Variables Vercel : <code>RESTREAM_CLIENT_ID</code>, <code>RESTREAM_CLIENT_SECRET</code>, <code>RESTREAM_REDIRECT_URI</code>.</p>
        </div>}
      </div>
     </>}
  </section>

  {account?.connected && <section className="v2-card restream-channels-panel" aria-labelledby="restream-channels-title">
   <div className="restream-section-heading">
    <div><h2 id="restream-channels-title">Chaînes connectées</h2><p>Synchronisées avec votre compte Restream.</p></div>
    <a href="https://restream.io/" target="_blank" rel="noopener noreferrer">Gérer sur Restream <ArrowUpRight size={14}/></a>
   </div>
   {account.channels.length ? <div className="restream-channel-grid">
    {account.channels.map(ch => <div className="restream-channel" key={ch.id}>
     <span><Video size={20}/></span>
     <div><strong>{ch.name}</strong><small>Chaîne liée au compte Restream</small></div>
     {ch.url && <a href={ch.url} target="_blank" rel="noopener noreferrer" aria-label={'Ouvrir '+ch.name}><ExternalLink size={16}/></a>}
    </div>)}
   </div> : <p className="restream-empty">Aucune chaîne disponible. Ajoutez YouTube, Facebook ou une autre destination directement dans Restream.</p>}
  </section>}

  <section className="v2-card restream-site-panel" aria-labelledby="restream-site-title">
   <div className="restream-section-heading">
    <div><h2 id="restream-site-title">Lecteur Restream de TV+ Afrique</h2><p>Restream produit le direct. Avec ton abonnement, YouTube Live permet de l’afficher sur le site.</p></div>
    <MonitorPlay size={22}/>
   </div>
   {settings?.enabled && !['youtube','restream'].includes(settings.player_platform) &&
    <div className="restream-current-source">Une ancienne source de diffusion est encore enregistrée. Elle ne sera plus affichée sur le site. Publiez le lecteur Restream pour remplacer son paramétrage.</div>}
   {account?.connected ? <>
    <div className="restream-auto-panel">
     {account.inProgressCount ? <p className="restream-live-found"><Radio size={15}/> {account.liveEventTitle ? 'Direct Restream détecté : ' + account.liveEventTitle : 'Une diffusion Restream est en cours'}</p>
      : <p className="restream-live-warning">Aucun événement en cours détecté. Lance le live dans Restream avec la destination YouTube activée, puis actualise.</p>}
     {account.youtubeLiveUrl ? <>
      <p>Le direct YouTube transmis par Restream est détecté. Tu peux l'afficher sur TV+ Afrique sans abonnement Business.</p>
      <button type="button" className="admin-btn admin-btn-primary" disabled={saving}
       onClick={()=>void activateLive('youtube')}>
       <MonitorPlay size={17}/> {saving?'Activation…':'Afficher le direct sur TV+'}
      </button>
     </> : <>
      <p><strong>Relie YouTube à ton direct dans Restream.</strong> Active la chaîne YouTube comme destination, puis clique sur « Actualiser » lorsque le live démarre.</p>
      <a href="https://support.restream.io/en/articles/3703373-stream-to-youtube" target="_blank" rel="noopener noreferrer">Comment connecter YouTube à Restream <ExternalLink size={14}/></a>
      <small>Si Restream ne renvoie pas de lien vidéo public, ajoute-le manuellement ci-dessous.</small>
     </>}
    </div>
    <details className="restream-manual">
     <summary>Ajouter le lien du live (si détection automatique indisponible)</summary>
     <div className="restream-site-grid">
      <form onSubmit={savePlayer} className="restream-site-form">
     <label className="v2-field"><span>Lien du direct YouTube Live transmis par Restream</span>
      <textarea rows={3} maxLength={3500} spellCheck={false}
       placeholder="https://www.youtube.com/live/XXXXXXXXXXX"
       value={playerCode} onChange={e=>setPlayerCode(e.target.value)}/>
      <small>Copie le lien de la vidéo YouTube qui est en direct depuis Restream. Aucune clé de diffusion n'est nécessaire.</small>
     </label>
     {playerCode && <p className={validPlayer?'restream-valid':'restream-invalid'}>
      {validPlayer?'Lien du direct reconnu.':'Adresse non reconnue : fournis le lien de la vidéo YouTube Live (pas l’adresse de la chaîne).'}
     </p>}
     <label className="restream-toggle">
      <input type="checkbox" checked={playerEnabled} onChange={e=>setPlayerEnabled(e.target.checked)}/>
      <span><strong>Afficher le direct sur le site</strong><small>Restream assure la diffusion ; Vercel ne transporte pas la vidéo.</small></span>
     </label>
     <button type="submit" className="admin-btn admin-btn-primary" disabled={saving || !settings || (playerEnabled && !validPlayer)}>
      {saving ? <LoaderCircle className="restream-spin" size={16}/> : <CheckCircle2 size={16}/>}
      {saving ? 'Enregistrement…' : 'Enregistrer le lecteur'}
     </button>
    </form>
    <aside className="restream-site-preview">
     {validPlayer ? <iframe title="Aperçu du direct TV+ Afrique" src={preview.embedUrl} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/> :
      <div className="restream-no-preview"><MonitorPlay size={30}/><strong>Aperçu du direct</strong><span>Ajoute le lien du direct YouTube Live envoyé depuis Restream.</span></div>}
     <Link href="/direct" target="_blank">Ouvrir la page Direct <ExternalLink size={14}/></Link>
    </aside>
     </div>
    </details>
   </> : <p className="restream-empty">Connectez d'abord votre compte Restream pour configurer son lecteur public.</p>}
  </section>
  <div className="restream-bottom-note"><ShieldCheck size={16}/> Les jetons d'accès Restream sont chiffrés côté serveur. Les chaînes sont consultées via l’API officielle ; le site utilise un lecteur Restream ou la destination YouTube Live officielle selon l'abonnement.</div>
 </div>;
}
