'use client';

import { useState } from 'react';
import { Check, Facebook, Linkedin, Link as LinkIcon, MessageCircle, Send, Share2 } from 'lucide-react';

const X_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.3 22H3.1l7.3-8.4L2.8 2h6.4l4.4 5.8L18.9 2Zm-1.1 18h1.7L7.5 3.9H5.7L17.8 20Z" />
  </svg>
);

export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'manual'>('idle');
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const whatsappText = encodeURIComponent(title + '\n' + url);

  const links = [
    { name: 'WhatsApp', icon: <MessageCircle size={15} />, href: `https://api.whatsapp.com/send?text=${whatsappText}` },
    { name: 'Facebook', icon: <Facebook size={15} />, href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { name: 'X', icon: X_ICON, href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}` },
    { name: 'LinkedIn', icon: <Linkedin size={15} />, href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { name: 'Telegram', icon: <Send size={15} />, href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}` },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('manual');
    }
  }

  async function nativeShare() {
    const shareData = { title, url };
    if (!navigator.share || navigator.canShare?.(shareData) === false) {
      await copyLink();
      return;
    }
    try {
      await navigator.share(shareData);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) await copyLink();
    }
  }

  return (
    <div className="share-buttons-row" role="group" aria-label="Partager cet article">
      <button type="button" className="share-btn share-btn-labeled share-btn-primary" onClick={nativeShare}>
        <Share2 size={16} aria-hidden="true" /> Partager
      </button>
      <button type="button" className="share-btn share-btn-labeled" onClick={copyLink}>
        {copyStatus === 'copied' ? <Check size={16} aria-hidden="true" /> : <LinkIcon size={16} aria-hidden="true" />}
        {copyStatus === 'copied' ? 'Lien copié' : 'Copier le lien'}
      </button>
      {links.map((item) => (
        <a
          key={item.name}
          href={item.href}
          className="share-btn"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Partager sur ${item.name}`}
          title={item.name}
        >
          {item.icon}
        </a>
      ))}
      <span className="share-feedback" role="status">
        {copyStatus === 'copied' && 'Lien de l’article copié.'}
      </span>
      {copyStatus === 'manual' && (
        <label className="share-manual">
          Copier le lien manuellement
          <input value={url} readOnly autoFocus onFocus={(event) => event.currentTarget.select()} />
        </label>
      )}
    </div>
  );
}
