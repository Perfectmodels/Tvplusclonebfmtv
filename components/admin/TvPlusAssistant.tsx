'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string };
type Quota = { limit: number; remaining: number };

export default function TvPlusAssistant() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/admin-v2/assistant', { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (response.ok && !controller.signal.aborted) setQuota(result.data);
      })
      .catch(() => {});
    return () => { controller.abort(); pending.current?.abort(); };
  }, []);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    const prompt = question.trim();
    if (!prompt || sending || quota?.remaining === 0) return;
    const controller = new AbortController();
    pending.current = controller;
    setSending(true);
    setError('');
    try {
      const response = await fetch('/api/admin-v2/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: prompt,
          history: messages.slice(-6).map((message) => ({ ...message, content: message.content.slice(0, 2400) })),
        }),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? 'TV+Assistant est temporairement indisponible.');
      if (controller.signal.aborted) return;
      setMessages((current) => [...current, { role: 'user', content: prompt }, { role: 'assistant', content: result.data.reply }]);
      setQuota(result.data);
      setQuestion('');
      requestAnimationFrame(() => end.current?.scrollIntoView({ block: 'end' }));
    } catch (reason) {
      if (!controller.signal.aborted) {
        setError(reason instanceof Error ? reason.message : 'La demande a échoué.');
        try {
          const status = await fetch('/api/admin-v2/assistant', { cache: 'no-store', signal: controller.signal });
          if (status.ok) setQuota((await status.json()).data);
        } catch {}
      }
    } finally {
      if (!controller.signal.aborted) setSending(false);
    }
  }

  return <div className="v2-newsroom-page">
    <header className="v2-newsroom-page-header"><div>
      <h1>TV+Assistant</h1>
      <p>Préparez un angle, reformulez un texte ou organisez une interview.</p>
    </div></header>
    <section className="v2-dashboard-panel v2-assistant" aria-label="Conversation avec TV+Assistant">
      {quota && <p className="v2-lede" role="status">
        {quota.remaining} / {quota.limit} demandes IA restantes aujourd’hui · Remix inclus · Renouvellement à minuit, heure de Libreville
      </p>}
      {messages.length > 0 && <ol className="v2-assistant-messages" aria-label="Messages" aria-live="polite">
        {messages.map((message, index) => <li key={index} className={'v2-note v2-assistant-message is-' + message.role}>
          <strong>{message.role === 'user' ? 'Vous' : 'TV+Assistant'}</strong>
          <p>{message.content}</p>
        </li>)}
      </ol>}
      {error && <p className="v2-error" role="alert">{error}</p>}
      <form onSubmit={send}>
        <label className="v2-field">
          <span>Votre question</span>
          <textarea value={question} maxLength={2000} rows={3} disabled={sending || quota?.remaining === 0}
            placeholder="Exemple : propose un angle pour ce sujet…" onChange={(event) => setQuestion(event.target.value)} />
        </label>
        <div className="v2-actions">
          <button type="submit" className="admin-btn admin-btn-primary" disabled={sending || !question.trim() || quota?.remaining === 0}>
            <Send size={16} aria-hidden="true" /> {sending ? 'Réponse en cours…' : 'Envoyer'}
          </button>
          {messages.length > 0 && <button type="button" className="admin-btn admin-btn-ghost" disabled={sending}
            onClick={() => { setMessages([]); setError(''); setQuestion(''); }}>
            <Sparkles size={16} aria-hidden="true" /> Nouvelle conversation
          </button>}
        </div>
      </form>
      <div ref={end} />
    </section>
  </div>;
}
