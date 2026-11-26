'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';

export default function ForgotForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('pending');
    setMessage('');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Envoi impossible.');
      setStatus('done');
      setMessage('Si un compte correspond à cette adresse, un lien de réinitialisation vous sera envoyé.');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Une erreur est survenue.');
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <label>
        <span>Adresse e-mail</span>
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" autoComplete="email" />
      </label>
      {status === 'error' && <p className="form-error" role="alert">{message}</p>}
      {status === 'done' && <p className="form-success" role="status">{message}</p>}
      <button type="submit" className="auth-submit" disabled={status === 'pending'}>
        <Mail size={16} /> {status === 'pending' ? 'Envoi…' : 'Recevoir le lien'}
      </button>
    </form>
  );
}
