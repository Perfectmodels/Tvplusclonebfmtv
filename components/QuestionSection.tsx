'use client';

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';

export default function QuestionSection() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    try {
      const response = await fetch('/api/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, question }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? 'Envoi impossible.');
      setFeedback({ type: 'success', message: 'Votre question a bien été transmise à la rédaction.' });
      setName(''); setEmail(''); setQuestion(''); setOpen(false);
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Une erreur est survenue.' });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="question-section" aria-labelledby="question-title">
      <div className="question-head">
        <span className="question-icon"><MessageCircle size={22} /></span>
        <div>
          <h2 id="question-title">Une question sur l’actualité ?</h2>
          <p>
            Découvrez dans l’application TV Plus notre outil conversationnel qui répond à toutes
            vos questions sur l’actualité, la politique, l’économie, le sport…
          </p>
        </div>
      </div>
      <button type="button" className="admin-btn admin-btn-primary" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        Je pose ma question à TV Plus
      </button>

      {feedback && (
        <p className={feedback.type === 'success' ? 'form-success' : 'form-error'} role={feedback.type === 'error' ? 'alert' : 'status'}>
          {feedback.message}
        </p>
      )}

      {open && (
        <form className="question-form" onSubmit={onSubmit}>
          <div className="question-form-row">
            <label><span>Votre nom</span><input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label><span>Votre e-mail</span><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          </div>
          <label><span>Votre question</span><textarea required minLength={10} rows={4} value={question} onChange={(e) => setQuestion(e.target.value)} /></label>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={sending}>
            {sending ? 'Envoi…' : 'Envoyer ma question'}
          </button>
        </form>
      )}
    </section>
  );
}
