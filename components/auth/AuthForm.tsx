'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';

type Mode = 'login' | 'signup';

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'idle' | 'pending' | 'error' | 'done'>('idle');
  const [message, setMessage] = useState('');

  const isLogin = mode === 'login';
  function nextPath(){const n=new URLSearchParams(window.location.search).get('next');if(!n||!n.startsWith('/')||n.startsWith('//')||n.includes('\\'))return null;const u=new URL(n,window.location.origin);return u.origin===window.location.origin&&(/^(?:\/direct|\/admin-v2|\/compte)(?:\/|$)/.test(u.pathname))?u.pathname+u.search:null;}
  const [returnTo,setReturnTo]=useState('');
  useEffect(()=>{setReturnTo(nextPath()||'');},[]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('pending');
    setMessage('');
    try {
      const response = await fetch(isLogin ? '/api/auth/login' : '/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isLogin ? { email, password } : { email, password, fullName }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Une erreur est survenue.');
      setStatus('done');
      if (isLogin) {
        const next = nextPath();
        let destination = '/compte';
        try {
          const meResponse = await fetch('/api/auth/me', { cache: 'no-store' });
          const me = await meResponse.json();
          const profile = me?.data?.profile;
          const permissions: string[] = profile?.permissions ?? [];
          const isAdmin = permissions.some(p=>['articles.read_all','settings.manage','shows.manage','schedule.manage','users.manage','roles.manage'].includes(p)) || ['admin', 'super_admin'].includes(profile?.role);
          if (isAdmin) destination = '/admin-v2';
        } catch {
          // En cas d'échec, on conserve la destination lecteur.
        }
        router.push(next || destination);
        router.refresh();
      } else {
        const next=nextPath();if(next&&!body.data?.needsConfirmation){router.push(next);router.refresh();return;}
        setMessage(
          body.data?.needsConfirmation
            ? 'Un e-mail de confirmation vous a été envoyé.'
            : 'Votre compte a été créé.',
        );
      }
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Une erreur est survenue.');
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      {!isLogin && (
        <label>
          <span>Nom complet</span>
          <input
            required
            minLength={2}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Votre nom"
            autoComplete="name"
          />
        </label>
      )}

      <label>
        <span>Adresse e-mail</span>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="votre@email.com"
          autoComplete="email"
        />
      </label>

      <label>
        <span>Mot de passe</span>
        <span className="auth-password">
          <input
            required
            type={showPassword ? 'text' : 'password'}
            minLength={isLogin ? 6 : 8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isLogin ? 'Votre mot de passe' : '8 caractères minimum, dont un chiffre'}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </span>
      </label>

      {status === 'error' && <p className="form-error" role="alert">{message}</p>}
      {status === 'done' && !isLogin && <p className="form-success" role="status">{message}</p>}

      <button type="submit" className="auth-submit" disabled={status === 'pending'}>
        {isLogin ? <LogIn size={16} /> : <UserPlus size={16} />}
        {status === 'pending' ? 'Patientez…' : isLogin ? 'Se connecter' : 'Créer mon compte'}
      </button>

      <p className="auth-switch">
        {isLogin ? (
          <>Pas encore de compte ? <Link href={"/inscription"+(returnTo?"?next="+encodeURIComponent(returnTo):"")}>Inscrivez-vous</Link></>
        ) : (
          <>Déjà inscrit ? <Link href={"/connexion"+(returnTo?"?next="+encodeURIComponent(returnTo):"")}>Connectez-vous</Link></>
        )}
      </p>
      {isLogin && (
        <p className="auth-switch"><Link href="/mot-de-passe-oublie">Mot de passe oublié ?</Link></p>
      )}
    </form>
  );
}
