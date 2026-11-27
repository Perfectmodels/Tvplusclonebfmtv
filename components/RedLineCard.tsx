'use client';

import Link from 'next/link';
import {useState} from 'react';
import type { RedLineItem } from '../lib/media/red-line';

export default function RedLineCard({ item }: { item: RedLineItem }) {
  const [failed,setFailed]=useState(false);
  const hasImage=!!item.image&&!failed;
  // Les affiches historiques sont affichées intégralement, sans texte superposé.
  if (item.legacy && hasImage) {
    return (
      <Link href={item.href} prefetch={false} className="redline-card is-legacy" aria-label={item.quote || 'Ligne Rouge'}>
        <img className="redline-card__photo" src={item.image} alt={item.quote || 'Ligne Rouge'} loading="lazy" decoding="async" onError={()=>setFailed(true)} />
      </Link>
    );
  }
  return (
    <Link href={item.href} prefetch={false} className={'redline-card'+(!hasImage?' is-text-only':'')} aria-label={item.quote||[item.person,item.role].filter(Boolean).join(' — ')||'Ligne Rouge'}>
      {hasImage && <img className="redline-card__photo" src={item.image} alt="" loading="lazy" decoding="async" onError={()=>setFailed(true)} />}
      <span className="redline-card__veil" aria-hidden="true" />
      <span className="redline-card__mark" aria-hidden="true">&ldquo;</span>
      <span className="redline-card__quote">{item.quote || 'Ligne Rouge'}</span>
      <span className="redline-card__footer">
        {item.person && <strong className="redline-card__name">{item.person}</strong>}
        {item.role && <small className="redline-card__role">{item.role}</small>}
        <span className="redline-card__rule" aria-hidden="true" />
      </span>
      <span className="redline-card__brand" aria-hidden="true">TV+</span>
    </Link>
  );
}
