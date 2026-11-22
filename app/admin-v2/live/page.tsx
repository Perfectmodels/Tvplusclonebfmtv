'use client';
import { useCallback,useEffect,useMemo,useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
 Activity,BookOpen,CheckCircle2,ChevronDown,ExternalLink,Eye,EyeOff,KeyRound,
 LockKeyhole,MonitorPlay,Plus,RadioTower,RotateCcw,Save,Server,ShieldCheck,Trash2
} from 'lucide-react';
import { STREAM_PROVIDERS,LIVE_PLAYER_PLATFORMS,resolveLivePlayback,extractLiveUrl,isVercelOrSitePlaybackUrl } from '../../../lib/video/live-platforms';

type Settings={
 title:string;description:string;standby_message:string;player_platform:string;playback_url:string;
 enabled:boolean;starts_at:string|null;ends_at:string|null;
};
type Target={
 id:string;name:string;provider:string;direction:'source'|'destination';
 protocol:'rtmps'|'rtmp'|'srt'|'whip'|'platform';
 watch_url:string;enabled:boolean;position:number;notes:string;
 has_endpoint:boolean;has_key:boolean;updated_at?:string;
};
type EditTarget=Omit<Target,'id'|'has_endpoint'|'has_key'|'updated_at'> & {
 endpoint:string;stream_key:string;clear_endpoint:boolean;clear_key:boolean;
};
const initial:Settings={
 title:'TV+ Afrique en direct',description:'',
 standby_message:'Le direct reprendra prochainement.',
 player_platform:'hls',playback_url:'',enabled:false,starts_at:null,ends_at:null
};
const blank:EditTarget={
 name:'',provider:'restream',direction:'source',protocol:'rtmps',
 watch_url:'',enabled:false,position:0,notes:'',
 endpoint:'',stream_key:'',clear_endpoint:false,clear_key:false
};
const fromTarget=(t:Target):EditTarget=>({
 name:t.name,provider:t.provider,direction:t.direction,protocol:t.protocol,
 watch_url:t.watch_url,enabled:t.enabled,position:t.position,notes:t.notes,
 endpoint:'',stream_key:'',clear_endpoint:false,clear_key:false
});
const local=(s:string|null)=>s?new Date(s).toLocaleString('sv-SE',{timeZone:'Africa/Libreville'}).replace(' ','T').slice(0,16):'';
const utc=(s:string)=>s?new Date(s+':00+01:00').toISOString():null;
const safeLabel=(p:string)=>STREAM_PROVIDERS.find(x=>x.id===p)?.label||p;

export default function RegieDirect(){
 const [settings,setSettings]=useState<Settings>(initial);
 const [targets,setTargets]=useState<Target[]>([]);
 const [editing,setEditing]=useState<string|null>(null);
 const [form,setForm]=useState<EditTarget>(blank);
 const [showSecret,setShowSecret]=useState(false);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const [message,setMessage]=useState(''),[error,setError]=useState('');
 const [tab,setTab]=useState<'source'|'destination'>('source');
 const [openForm,setOpenForm]=useState(false);
 const load=useCallback(async()=>{
  const [a,b]=await Promise.all([
   fetch('/api/admin-v2/live',{cache:'no-store'}),
   fetch('/api/admin-v2/live/targets',{cache:'no-store'})
  ]);
  const [s,c]=await Promise.all([a.json(),b.json()]);
  if(!a.ok||!b.ok)throw Error(s.error?.message||c.error?.message||'Régie indisponible.');
  setSettings({...initial,...s.data});
  setTargets(c.data?.items||[]);
 },[]);
 useEffect(()=>{void load().catch(e=>setError(e.message)).finally(()=>setLoading(false))},[load]);
 const current=useMemo(()=>resolveLivePlayback(settings.player_platform,settings.playback_url),[settings.player_platform,settings.playback_url]);
 const currentTab=targets.filter(x=>x.direction===tab);
 const provider=STREAM_PROVIDERS.find(p=>p.id===form.provider);
 const selectedTarget=editing?targets.find(x=>x.id===editing):null;
 const field=<K extends keyof Settings>(key:K,value:Settings[K])=>{setSettings(prev=>({...prev,[key]:value}));setMessage('');};
 const edit=<K extends keyof EditTarget>(key:K,value:EditTarget[K])=>{setForm(prev=>({...prev,[key]:value}));setMessage('');};
 function clearEdit(){setEditing(null);setForm({...blank,direction:tab});setShowSecret(false);setOpenForm(false);}
 function beginEdit(target:Target){setTab(target.direction);setEditing(target.id);setForm(fromTarget(target));setOpenForm(true);setShowSecret(false);setMessage('');setError('');}
 function beginAdd(direction:'source'|'destination'){setTab(direction);setEditing(null);setForm({...blank,direction});setOpenForm(true);setMessage('');setError('');}
 async function saveSettings(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setMessage('');setError('');
  try{
   const r=await fetch('/api/admin-v2/live',{
    method:'PATCH',headers:{'Content-Type':'application/json'},
    body:JSON.stringify(settings)
   });const j=await r.json();
   if(!r.ok){
    const fields=j.error?.details?.fieldErrors;
    const first=fields?Object.values(fields).flat().find(Boolean):null;
    throw Error(typeof first==='string'?first:j.error?.message||'Configuration du lecteur invalide.');
   }
   setSettings({...initial,...j.data});
   setMessage('Configuration du lecteur TV+ enregistrée.');
  }catch(e){setError(e instanceof Error?e.message:'Erreur de réseau.');}
  finally{setBusy(false);}
 }
 async function saveTarget(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setMessage('');setError('');
  try{
   const r=await fetch('/api/admin-v2/live/targets',{
    method:editing?'PATCH':'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({...form,...editing?{id:editing}:{}})
   });
   const j=await r.json();
   if(!r.ok){
    const details=j.error?.details?.fieldErrors;
    const first=details?Object.values(details).flat().find(Boolean):null;
    throw Error(typeof first==='string'?first:j.error?.message||'Profil invalide.');
   }
   await load();clearEdit();
   setMessage('Profil enregistré. Les clés et adresses privées ont été chiffrées et ne sont plus affichées.');
  }catch(e){setError(e instanceof Error?e.message:'Erreur de réseau.');}
  finally{setBusy(false);}
 }
 async function removeTarget(id:string){
  if(!window.confirm('Supprimer ce profil et ses informations d’accès chiffrées ?'))return;
  setBusy(true);setError('');setMessage('');
  try{
   const r=await fetch('/api/admin-v2/live/targets',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});
   const j=await r.json();if(!r.ok)throw Error(j.error?.message||'Suppression refusée.');
   await load();if(editing===id)clearEdit();setMessage('Profil supprimé et clés associées effacées.');
  }catch(e){setError(e instanceof Error?e.message:'Erreur réseau.');}finally{setBusy(false);}
 }
 return <div className="v2-regie live-studio">
  <header className="v2-head">
   <div>
    <p className="v2-newsroom-eyebrow">DIFFUSION · RESTREAM · OBS · RTMPS · WHIP</p>
    <h1 className="v2-title">Régie du direct</h1>
    <p className="v2-lede">Configurez le signal entrant, les plateformes de diffusion et le lecteur public sans mélanger les clés d'émission et les liens de visionnage.</p>
   </div>
   <Link href="/direct" target="_blank" className="admin-btn admin-btn-ghost"><ExternalLink size={16}/> Voir le Direct</Link>
  </header>
  <div className="v2-regie-summary">
   <div className="v2-card"><MonitorPlay size={21}/><p>Lecteur sur le site</p><strong>{settings.enabled?'Activé par la régie':'En attente'}</strong></div>
   <div className="v2-card"><Server size={21}/><p>Entrées configurées</p><strong>{targets.filter(t=>t.direction==='source').length}</strong></div>
   <div className="v2-card"><RadioTower size={21}/><p>Sorties référencées</p><strong>{targets.filter(t=>t.direction==='destination').length}</strong></div>
  </div>
  {error&&<div className="v2-error" role="alert">{error}</div>}
  {message&&<div className="v2-success" role="status">{message}</div>}
  <section className="v2-card live-studio-flow" aria-label="Circuit de diffusion">
   <h2>Comment circule votre direct ?</h2>
   <div className="live-studio-diagram">
    <div><RadioTower size={20}/><strong>1 · Émettre</strong><small>OBS, caméra, vMix ou Restream Studio</small></div>
    <span aria-hidden="true">→</span>
    <div><Server size={20}/><strong>2 · Distribuer</strong><small>Restream ou serveur RTMP/SRT/WHIP</small></div>
    <span aria-hidden="true">→</span>
    <div><MonitorPlay size={20}/><strong>3 · Regarder</strong><small>TV+ via iframe Restream, YouTube ou HLS</small></div>
   </div>
   <p className="v2-note"><ShieldCheck size={15}/> <strong>Important :</strong> les profils de diffusion sont sécurisés et documentent la régie. Vercel ne reçoit pas de flux RTMP et ne pousse pas automatiquement vers ces plateformes. Les comptes de diffusion doivent être configurés et démarrés dans Restream, OBS ou un service vidéo dédié.</p>
  </section>
  {loading?<div className="v2-card">Chargement de la configuration…</div>:<>
   <section className="v2-card" aria-labelledby="live-profiles-title">
    <div className="v2-regie-section-head">
     <div><h2 id="live-profiles-title" className="v2-panel-title">1. Serveurs et destinations</h2><p className="v2-note">Enregistrez les paramètres RTMPS, SRT, WHIP et les liens de chaînes. Les secrets restent chiffrés.</p></div>
     <button className="admin-btn admin-btn-ghost" type="button" disabled={busy} onClick={()=>void load().catch(e=>setError(e.message))}><RotateCcw size={16}/> Actualiser</button>
    </div>
    <div className="live-studio-tabs" role="group" aria-label="Type de configuration">
     <button type="button" aria-pressed={tab==='source'} onClick={()=>{setTab('source');setOpenForm(false);setEditing(null)}}>Entrées · OBS / Restream</button>
     <button type="button" aria-pressed={tab==='destination'} onClick={()=>{setTab('destination');setOpenForm(false);setEditing(null)}}>Destinations · réseaux sociaux</button>
    </div>
    <div className="v2-regie-channels live-studio-targets">
     {currentTab.map(t=><div className="v2-regie-channel" key={t.id}>
      <div>
       <strong>{t.name}</strong>
       <span>{safeLabel(t.provider)} · {t.protocol.toUpperCase()} · {t.enabled?'Profil activé':'Profil en attente'}</span>
       <small><LockKeyhole size={12}/> Serveur : {t.has_endpoint?'enregistré en coffre-fort':'à renseigner'} · Clé : {t.has_key?'protégée':'non renseignée'}</small>
       {t.watch_url&&<a target="_blank" rel="noopener noreferrer" href={t.watch_url}>Ouvrir la chaîne publique <ExternalLink size={13}/></a>}
      </div>
      <div className="v2-actions">
       <button className="admin-btn admin-btn-ghost" type="button" disabled={busy} onClick={()=>beginEdit(t)}>Configurer</button>
       <button className="admin-btn admin-btn-ghost" type="button" disabled={busy} onClick={()=>void removeTarget(t.id)} aria-label={'Supprimer '+t.name}><Trash2 size={15}/></button>
      </div>
     </div>)}
     {!currentTab.length&&<p className="v2-note">Aucun profil enregistré pour cet onglet. Vous pouvez ajouter Restream, YouTube, Facebook, TikTok ou un serveur personnalisé.</p>}
    </div>
    {!openForm&&<button type="button" className="admin-btn admin-btn-primary live-studio-add" onClick={()=>beginAdd(tab)}><Plus size={17}/> {tab==='source'?'Ajouter un serveur d’émission':'Ajouter une destination'}</button>}
    {openForm&&<form className="live-studio-form" onSubmit={saveTarget} autoComplete="off">
     <div className="v2-regie-section-head"><h3>{editing?'Modifier un profil':'Nouveau profil de diffusion'}</h3><button className="admin-btn admin-btn-ghost" type="button" onClick={clearEdit}>Annuler</button></div>
     <div className="v2-regie-times">
      <label className="v2-field"><span>Nom de la configuration *</span><input required minLength={2} maxLength={120} value={form.name} placeholder="Ex. Restream — Direct TV+" onChange={e=>edit('name',e.target.value)}/></label>
      <label className="v2-field"><span>Plateforme / encodeur</span><select value={form.provider} onChange={e=>edit('provider',e.target.value)}>{STREAM_PROVIDERS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
     </div>
     {provider&&<p className="live-studio-provider-help"><BookOpen size={15}/>{provider.help} {provider.docs&&<a href={provider.docs} target="_blank" rel="noopener noreferrer">Documentation <ExternalLink size={12}/></a>}</p>}
     <div className="v2-regie-times">
      <label className="v2-field"><span>Rôle</span><select value={form.direction} onChange={e=>edit('direction',e.target.value as EditTarget['direction'])}><option value="source">Source d’émission : OBS vers le serveur</option><option value="destination">Destination : serveur vers une plateforme</option></select></label>
      <label className="v2-field"><span>Protocole</span><select value={form.protocol} onChange={e=>edit('protocol',e.target.value as EditTarget['protocol'])}>
       <option value="rtmps">RTMPS (recommandé)</option><option value="rtmp">RTMP</option>
       <option value="srt">SRT</option><option value="whip">WHIP · HTTPS</option>
       <option value="platform">Plateforme / liaison OAuth externe</option></select></label>
     </div>
     <div className="v2-regie-times">
      <label className="v2-field"><span><LockKeyhole size={14}/> Adresse du serveur ou URL WHIP privée</span><input
       value={form.endpoint} type="text" inputMode="url" maxLength={2500}
       placeholder={selectedTarget?.has_endpoint?'Adresse chiffrée enregistrée — laisser vide pour conserver':form.protocol==='whip'?'https://…/whip/…':form.protocol==='srt'?'srt://…':'rtmps://…'}
       onChange={e=>edit('endpoint',e.target.value)} autoComplete="off" spellCheck={false}/>
       {selectedTarget?.has_endpoint&&<label className="live-studio-clear"><input type="checkbox" checked={form.clear_endpoint} onChange={e=>edit('clear_endpoint',e.target.checked)}/> Effacer l’adresse sauvegardée</label>}
      </label>
      <label className="v2-field"><span><KeyRound size={14}/> Clé de stream / jeton privé (si nécessaire)</span>
       <div className="live-studio-key-input"><input type={showSecret?'text':'password'} value={form.stream_key} maxLength={2500} autoComplete="new-password"
        placeholder={selectedTarget?.has_key?'Clé chiffrée enregistrée — laisser vide pour conserver':'Coller la clé fournie par le diffuseur'}
        onChange={e=>edit('stream_key',e.target.value)} spellCheck={false}/>
        <button type="button" aria-label={showSecret?'Masquer la clé':'Afficher la clé saisie'} onClick={()=>setShowSecret(x=>!x)}>
         {showSecret?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
       {selectedTarget?.has_key&&<label className="live-studio-clear"><input type="checkbox" checked={form.clear_key} onChange={e=>edit('clear_key',e.target.checked)}/> Effacer la clé sauvegardée</label>}
      </label>
     </div>
     <p className="v2-note">La clé et le serveur sont transmis seulement à l’API d’administration puis chiffrés dans Supabase Vault. Ils ne sont plus lisibles après enregistrement. Pour diffuser, renseignez également ces informations dans OBS, Restream ou votre prestataire.</p>
     <label className="v2-field"><span>Lien public de visionnage (facultatif)</span>
      <input type="url" value={form.watch_url} placeholder="https://www.youtube.com/live/…" maxLength={1400}
       onChange={e=>edit('watch_url',e.target.value)}/>
      <small>Uniquement pour ouvrir la chaîne du diffuseur. Ne collez pas ici une URL RTMP, SRT ou WHIP.</small>
     </label>
     <label className="v2-field"><span>Notes de régie</span><textarea rows={2} maxLength={1000} value={form.notes} placeholder="Service, équipe responsable, configuration OBS…" onChange={e=>edit('notes',e.target.value)}/></label>
     <div className="v2-regie-times">
      <label className="v2-field"><span>Ordre</span><input type="number" min={0} max={999} value={form.position} onChange={e=>edit('position',Number(e.target.value))}/></label>
      <label className="v2-regie-check"><input type="checkbox" checked={form.enabled} onChange={e=>edit('enabled',e.target.checked)}/> Marquer le profil comme actif (n’ouvre pas le direct chez le prestataire)</label>
     </div>
     <div className="v2-actions">
      <button className="admin-btn admin-btn-primary" disabled={busy} type="submit"><Save size={16}/>{busy?'Enregistrement…':'Enregistrer le profil sécurisé'}</button>
      <button className="admin-btn admin-btn-ghost" type="button" onClick={clearEdit}>Annuler</button>
     </div>
    </form>}
   </section>
   <section className="v2-card" aria-labelledby="live-reader-title">
    <div className="v2-regie-section-head"><div><h2 id="live-reader-title" className="v2-panel-title">2. Lecteur visible sur TV+ Afrique</h2><p className="v2-note">Les playlists HLS et segments vidéo sont téléchargés directement depuis le diffuseur ou son CDN, jamais depuis Vercel. Utilisez une adresse HTTPS externe, autorisant CORS pour le HLS.</p></div></div>
    <div className="v2-edit-grid">
     <form onSubmit={saveSettings}>
      <label className="v2-field"><span>Titre du direct *</span><input required minLength={3} maxLength={120} value={settings.title} onChange={e=>field('title',e.target.value)}/></label>
      <label className="v2-field"><span>Description éditoriale</span><textarea rows={2} maxLength={1200} value={settings.description} onChange={e=>field('description',e.target.value)}/></label>
      <label className="v2-field"><span>Type de lecteur</span>
       <select value={settings.player_platform} onChange={e=>field('player_platform',e.target.value)}>{LIVE_PLAYER_PLATFORMS.map(x=><option value={x[0]} key={x[0]}>{x[1]}</option>)}</select></label>
      <label className="v2-field"><span>URL publique de lecture ou code iframe (Restream)</span><textarea rows={3} maxLength={3500}
       placeholder={settings.player_platform==='restream'?'<iframe src="https://player.restream.io/?…"></iframe>':settings.player_platform==='hls'?'https://…/playlist.m3u8':'https://…'}
       value={settings.playback_url} onChange={e=>field('playback_url',e.target.value)}/></label>
      {settings.playback_url&&<p className="v2-note">{isVercelOrSitePlaybackUrl(settings.playback_url)?'Adresse refusée : ne diffusez pas de vidéo via Vercel. Utilisez le CDN HLS ou le lecteur de votre fournisseur.':current.playbackUrl ? current.embedUrl?'Lecteur intégrable externe compatible.':current.hlsUrl?'URL de flux HLS externe reconnue (vérifiez aussi les règles CORS du diffuseur).':'Lien externe uniquement : pas de lecteur iframe garanti.' : 'URL ou iframe non reconnu. Vérifiez le type de lecteur et le lien HTTPS.'}</p>}
      <label className="v2-field"><span>Message d’attente hors antenne</span><input maxLength={350} value={settings.standby_message} onChange={e=>field('standby_message',e.target.value)}/></label>
      <div className="v2-regie-times">
       <label className="v2-field"><span>Début d’affichage · Libreville</span><input type="datetime-local" value={local(settings.starts_at)} onChange={e=>field('starts_at',utc(e.target.value))}/></label>
       <label className="v2-field"><span>Fin d’affichage · Libreville</span><input type="datetime-local" value={local(settings.ends_at)} onChange={e=>field('ends_at',utc(e.target.value))}/></label>
      </div>
      <label className="v2-regie-check"><input type="checkbox" checked={settings.enabled} onChange={e=>field('enabled',e.target.checked)}/> Afficher le lecteur public (ne démarre pas la diffusion externe)</label>
      <button className="admin-btn admin-btn-primary" disabled={busy} type="submit"><Save size={16}/>{busy?'Enregistrement…':'Enregistrer le lecteur'}</button>
     </form>
     <aside>
      <h3>Prévisualisation du signal public</h3>
      <div className="v2-regie-preview">
       {current.embedUrl?<iframe src={current.embedUrl} title="Prévisualisation du lecteur" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" style={{width:'100%',aspectRatio:'16/9'}}/>:
       current.hlsUrl?<div><MonitorPlay size={30}/><strong>Flux HLS configuré</strong><p>Le contrôle de lecture HLS s'effectue sur le site, avec hls.js si nécessaire.</p></div>:
       <div><MonitorPlay size={30}/><strong>{settings.title}</strong><p>{current.playbackUrl?'Lecture externe uniquement.':'Aucun lecteur public configuré.'}</p></div>}
      </div>
      <Link className="admin-btn admin-btn-ghost" target="_blank" href="/direct"><ExternalLink size={15}/> Ouvrir la page Direct</Link>
      <h3>Restream : la procédure recommandée</h3>
      <ol className="v2-regie-checklist">
       <li>Créer une diffusion RTMP/Encoder ou utiliser Restream Studio.</li>
       <li>Configurer OBS avec l’adresse RTMPS et la clé fournies par Restream.</li>
       <li>Dans Restream, ajouter « Embed Player », si disponible sur votre offre.</li>
       <li>Copier son code iframe et le coller dans le champ de lecture ci-contre.</li>
       <li>Activer le lecteur TV+, puis tester la diffusion réelle sur mobile et ordinateur.</li>
      </ol>
      <p className="v2-note"><ShieldCheck size={15}/> Une URL WHIP d’émission ne doit jamais être collée dans le lecteur public.</p>
     </aside>
    </div>
   </section>
  </>}
 </div>;
}
