'use client';

import { useRef, useState } from 'react';
import { Mail } from 'lucide-react';

export default function ForgotForm({returnTo='',expired=false}:{returnTo?:string;expired?:boolean}) {
  const submitting=useRef(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(submitting.current||status==='done')return;
    submitting.current=true;
    setStatus('pending');
    setMessage('');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email:email.trim(), next:returnTo }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Envoi impossible.');
      setStatus('done');
      setMessage('Si un compte correspond à cette adresse, un lien de réinitialisation vous sera envoyé. Vérifiez aussi vos courriers indésirables.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Une erreur est survenue.');
    } finally { submitting.current=false; }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit} aria-busy={status==='pending'}>
      {expired&&<p className="form-error" role="alert">Le lien est invalide ou expiré. Demandez un nouveau lien de récupération.</p>}
      <label>
        <span>Adresse e-mail</span>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" autoComplete="email" />
      </label>
      {status === 'error' && <p className="form-error" role="alert">{message}</p>}
      {status === 'done' && <p className="form-success" role="status">{message}</p>}
      <button type="submit" className="auth-submit" disabled={status === 'pending'||status==='done'}>
        <Mail size={16} /> {status === 'pending' ? 'Envoi…' : status==='done'?'Demande envoyée':'Recevoir le lien'}
      </button>
    </form>
  );
}
