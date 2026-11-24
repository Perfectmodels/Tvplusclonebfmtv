'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Search, Send, X } from 'lucide-react';

type Result = { answer: string; links: { href: string; title: string }[] };

export default function PublicAssistant() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => {
    setOpen(pathname === '/recherche' && new URLSearchParams(window.location.search).get('assistant') === '1');
  }, [pathname]);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  useEffect(() => () => pending.current?.abort(), []);

  function close() {
    setOpen(false);
    requestAnimationFrame(() => launcher.current?.focus());
  }

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const query = question.trim();
    if (query.length < 3 || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setAsked(query);
    setError('');
    setResult(null);
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query }),
        signal: controller.signal,
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? 'La recherche est temporairement indisponible.');
      if (!controller.signal.aborted) setResult(body.data);
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'La recherche est temporairement indisponible.');
    } finally {
      if (pending.current === controller) pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return <div className={'tv-assistant' + (open ? ' is-open' : '')}>
    {open ? <section id="tv-assistant-panel" role="dialog" aria-labelledby="tv-assistant-title" className="tv-assistant-panel"
      onKeyDown={(event) => { if (event.key === 'Escape') close(); }}>
      <header>
        <img src="/tvplus-assistant.jpeg" width={45} height={45} alt="" />
        <h2 id="tv-assistant-title">TV+Assistant</h2>
        <button type="button" className="tv-assistant-close" onClick={close} aria-label="Fermer TV+Assistant"><X size={22} /></button>
      </header>
      <div className="tv-assistant-results" aria-live="polite">
        {!asked && <p>Quel sujet recherchez-vous dans les articles de TV+ Afrique ?</p>}
        {asked && <p className="tv-assistant-question">{asked}</p>}
        {busy && <p className="tv-assistant-loading"><Search size={17} /> Recherche dans les articles…</p>}
        {error && <p>{error}</p>}
        {result && <>
          <p>{result.answer}</p>
          {result.links.length > 0 && <ul>{result.links.map((link) => <li key={link.href}>
            <Link href={link.href} onClick={() => setOpen(false)}>{link.title}<ArrowUpRight size={16} aria-hidden="true" /></Link>
          </li>)}</ul>}
        </>}
        {asked && !busy && (!result || !result.links.length) &&
          <Link href={'/recherche?q=' + encodeURIComponent(asked)} onClick={() => setOpen(false)}>Ouvrir la recherche du site</Link>}
      </div>
      <form onSubmit={search}>
        <input ref={input} aria-label="Rechercher dans les articles" placeholder="Un sujet, un nom, un lieu…" maxLength={240}
          value={question} onChange={(event) => setQuestion(event.target.value)} />
        <button type="submit" className="tv-assistant-send" aria-label="Lancer la recherche" disabled={busy || question.trim().length < 3}>
          <Send size={19} />
        </button>
      </form>
    </section> : <button ref={launcher} type="button" className="tv-assistant-launch" onClick={() => setOpen(true)}
      aria-label="Ouvrir TV+Assistant pour trouver un article" aria-expanded={false}>
      <img src="/tvplus-assistant.jpeg" width={44} height={44} alt="" />
      <span>TV+Assistant</span>
    </button>}
  </div>;
}
