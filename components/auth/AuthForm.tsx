'use client';
import {useRef,useState} from 'react';
import Link from 'next/link';
import {Eye,EyeOff,LogIn,UserPlus,ShieldCheck,LockKeyhole,LoaderCircle} from 'lucide-react';
import PasswordFields from './PasswordFields';
export default function AuthForm({mode,returnTo,confirmationFailed}:{mode:'login'|'signup';returnTo:string;confirmationFailed:boolean}){
 const isLogin=mode==='login',query=returnTo?'?next='+encodeURIComponent(returnTo):'';
 const submitting=useRef(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[repeat,setRepeat]=useState(''),[show,setShow]=useState(false),[status,setStatus]=useState<'idle'|'pending'|'error'|'done'>('idle'),[error,setError]=useState(confirmationFailed?'Ce lien a expiré ou est invalide. Demandez un nouveau lien.':'');
 const pending=status==='pending'||status==='done';
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(submitting.current||pending)return;
  if(!isLogin&&password!==repeat){setError('Les mots de passe ne correspondent pas.');return;}
  submitting.current=true;setStatus('pending');setError('');
  try{const response=await fetch(isLogin?'/api/auth/login':'/api/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email.trim(),password,...(!isLogin?{fullName:name}:{}),next:returnTo})});
  const body=await response.json();if(!response.ok)throw Error(body?.error?.message||'Service indisponible.');
  if(!body?.data?.next)throw Error('Impossible d’ouvrir votre session. Utilisez la connexion ou réessayez.');
  setStatus('done');window.location.replace(body.data.next);
  }catch(e){setStatus('error');setError(e instanceof Error?e.message:'Une erreur est survenue.');}finally{submitting.current=false;}
 }
 return <>
 <nav className="tv-auth-mode" aria-label="Accès au compte"><Link href={'/connexion'+query} aria-current={isLogin?'page':undefined}>Connexion</Link><Link href={'/inscription'+query} aria-current={!isLogin?'page':undefined}>Créer un compte</Link></nav>
 <form className="auth-form" onSubmit={submit} aria-busy={pending}>
 {returnTo.startsWith('/direct')&&<div className="tv-auth-context"><LockKeyhole size={18}/><span>Identifiez-vous pour reprendre votre accès au Direct Premium. Votre destination est conservée.</span></div>}
 {!isLogin&&<label><span>Nom complet</span><input autoComplete="name" name="name" placeholder="Votre prénom et nom" required minLength={2} maxLength={120} value={name} disabled={pending} onChange={e=>setName(e.target.value)}/></label>}
 <label><span>Adresse e-mail</span><input required type="email" autoComplete="email" name="email" placeholder="vous@exemple.com" disabled={pending} value={email} onChange={e=>setEmail(e.target.value)}/></label>
 {isLogin?<><label><span>Mot de passe</span><span className="auth-password"><input type={show?'text':'password'} autoComplete="current-password" name="password" required minLength={6} maxLength={200} disabled={pending} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Votre mot de passe"/><button type="button" aria-label={show?'Masquer le mot de passe':'Afficher le mot de passe'} onClick={()=>setShow(v=>!v)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></span></label><p className="auth-switch"><Link href={'/mot-de-passe-oublie'+query}>Mot de passe oublié ?</Link></p></>:<><PasswordFields password={password} repeat={repeat} onPassword={setPassword} onRepeat={setRepeat} disabled={pending}/><div className="tv-auth-context"><ShieldCheck size={18}/><span>Inscription immédiate, sans e-mail de confirmation. Utilisez une adresse qui vous appartient pour récupérer votre compte si nécessaire.</span></div><p className="tv-auth-legal">En créant votre compte, vous acceptez les <Link href="/cgu" target="_blank" rel="noopener">conditions d’utilisation</Link> et la <Link href="/donnees-personnelles" target="_blank" rel="noopener">politique de confidentialité</Link>.</p></>}
 {error&&<p className="form-error" role="alert">{error}</p>}
 <button className="auth-submit" disabled={pending} type="submit">{pending?<LoaderCircle size={18}/>:isLogin?<LogIn size={18}/>:<UserPlus size={18}/>} {pending?'Connexion en cours…':isLogin?'Se connecter':'Créer mon compte'}</button>
 <p className="auth-switch">{isLogin?<>Pas encore de compte ? <Link href={'/inscription'+query}>Inscrivez-vous</Link></>:<>Déjà inscrit ? <Link href={'/connexion'+query}>Connectez-vous</Link></>}</p>
 </form></>;
}
