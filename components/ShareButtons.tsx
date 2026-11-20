'use client';

import { useState } from 'react';
import { Facebook, Linkedin, Link as LinkIcon, MessageCircle, Send, Share2 } from 'lucide-react';

const X_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-4.9-6.4L6.3 22H3.1l7.3-8.4L2.8 2h6.4l4.4 5.8L18.9 2Zm-1.1 18h1.7L7.5 3.9H5.7L17.8 20Z" />
  </svg>
);

export default function ShareButtons({ url, title }: { url?: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  const target = url ?? (typeof window !== 'undefined' ? window.location.href : '');
  const label = title ?? '';
  const encodedUrl = encodeURIComponent(target);
  const encodedTitle = encodeURIComponent(label);

  const links = [
    { name: 'Facebook', icon: <Facebook size={15} />, href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { name: 'WhatsApp', icon: <MessageCircle size={15} />, href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}` },
    { name: 'X', icon: X_ICON, href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}` },
    { name: 'LinkedIn', icon: <Linkedin size={15} />, href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { name: 'Telegram', icon: <Send size={15} />, href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}` },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(target);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  async function nativeShare() {
    if (!navigator.share) return copyLink();
    try {
      await navigator.share({ title: label, url: target });
    } catch {
      // partage annulé par l'utilisateur
    }
  }

  return (
    <div className="share-buttons-row">
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
      <button type="button" className="share-btn" onClick={nativeShare} aria-label="Partager" title="Partager">
        <Share2 size={15} />
      </button>
      <button type="button" className="share-btn" onClick={copyLink} aria-label="Copier le lien court" title="Copier le lien court">
        <LinkIcon size={15} />
      </button>
      {copied && <span className="share-feedback" role="status">Lien court copié</span>}
    </div>
  );
}
