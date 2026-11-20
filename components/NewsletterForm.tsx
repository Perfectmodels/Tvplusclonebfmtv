'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

type Status = 'idle' | 'pending' | 'done' | 'error';

export default function NewsletterForm({ name }: { name: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('pending');
    setMessage('');
    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newsletter: name }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Inscription impossible.');
      setStatus('done');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Une erreur est survenue.');
    }
  }

  if (status === 'done') {
    return (
      <p className="form-success" role="status">
        <Check size={16} /> Merci ! Votre inscription à « {name} » est enregistrée.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="newsletter-form">
        <label className="sr-only" htmlFor={'email-' + name}>Votre adresse e-mail</label>
        <input
          id={'email-' + name}
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="votre@email.com"
          disabled={status === 'pending'}
        />
        <button type="submit" disabled={status === 'pending'}>
          {status === 'pending' ? 'Envoi…' : 'S’inscrire'}
        </button>
      </div>
      {status === 'error' && (
        <p className="form-error" role="alert">
          {message} <button type="button" className="newsletter-retry" onClick={() => setStatus('idle')}>Réessayer</button>
        </p>
      )}
    </form>
  );
}
