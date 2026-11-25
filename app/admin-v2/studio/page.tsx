import Link from 'next/link';
import {redirect} from 'next/navigation';
import {getV2Actor} from '../../../lib/auth/v2-admin';
import {kinds,formats,canManageStudio} from '../../../lib/media/studio-types';
import {Film,Mic,Video} from 'lucide-react';
import './studio.css';
export default async function StudioHome(){const actor=await getV2Actor();if(!actor)redirect('/connexion?next=/admin-v2/studio');const visible=kinds.filter(k=>canManageStudio(actor.permissions,k));if(!visible.length)redirect('/acces-refuse');const icons={reel:Film,podcast:Mic,reportage:Video};return <div className="studio-shell"><header className="studio-head"><div><p className="studio-kicker">TV+ AFRIQUE · PRODUCTION NUMÉRIQUE</p><h1>Studio audiovisuel</h1><p>Trois espaces de travail, une chaîne de validation éditoriale.</p></div></header><div className="studio-hub">{visible.map(k=>{const f=formats[k],Icon=icons[k];return <Link className="studio-module" key={k} href={'/admin-v2/studio/'+f.slug}><Icon size={30}/><h2>{f.title}</h2><p>{f.description}</p><strong>Ouvrir le catalogue →</strong></Link>})}</div></div>;}
