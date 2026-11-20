'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

export default function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'pending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('pending');
    setMessage('');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Envoi impossible.');
      setStatus('done');
      setForm({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Une erreur est survenue.');
    }
  }

  if (status === 'done') {
    return (
      <p className="form-success" role="status">
        <Check size={16} /> Votre message a bien été transmis à la rédaction.
      </p>
    );
  }

  return (
    <form className="contact-form" onSubmit={onSubmit}>
      <div className="contact-form-row">
        <label>
          <span>Nom</span>
          <input required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>
        <label>
          <span>Adresse e-mail</span>
          <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
      </div>
      <label>
        <span>Objet</span>
        <input required minLength={3} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
      </label>
      <label>
        <span>Message</span>
        <textarea required minLength={10} rows={6} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
      </label>
      <button type="submit" className="contact-submit" disabled={status === 'pending'}>
        {status === 'pending' ? 'Envoi…' : 'Envoyer le message'}
      </button>
      {status === 'error' && <p className="form-error" role="alert">{message}</p>}
    </form>
  );
}
