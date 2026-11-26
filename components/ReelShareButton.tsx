'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';

export default function ReelShareButton({ title }: { title: string }) {
  const [notice, setNotice] = useState('');

  async function share() {
    const url = window.location.href;
    setNotice('');
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setNotice('Lien copié.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setNotice('Partage indisponible.');
    }
  }

  return (
    <div className="av-page-nav">
      <button type="button" onClick={() => void share()}><Share2 size={16} aria-hidden="true" /> Partager</button>
      {notice && <span role="status">{notice}</span>}
    </div>
  );
}
