'use client';

import { useState, type ReactNode } from 'react';
import { Monitor, Smartphone, X } from 'lucide-react';
import TvPlusLogo from '../TvPlusLogo';

type Node = { type?: string; text?: string; attrs?: Record<string, any>; content?: Node[]; marks?: { type?: string; attrs?: Record<string, any> }[] };

function renderNode(node: Node, key: number): ReactNode {
  const children = (node.content ?? []).map((child, i) => renderNode(child, i));
  switch (node.type) {
    case 'text': {
      let text: ReactNode = node.text ?? '';
      for (const mark of node.marks ?? []) {
        if (mark.type === 'bold') text = <strong>{text}</strong>;
        if (mark.type === 'italic') text = <em>{text}</em>;
        if (mark.type === 'underline') text = <u>{text}</u>;
        if (mark.type === 'strike') text = <s>{text}</s>;
        if (mark.type === 'link') text = <a href={mark.attrs?.href} target="_blank" rel="noopener noreferrer">{text}</a>;
      }
      return <span key={key}>{text}</span>;
    }
    case 'paragraph': return <p key={key}>{children}</p>;
    case 'heading': {
      const level = [2, 3, 4].includes(Number(node.attrs?.level)) ? Number(node.attrs?.level) : 2;
      return level === 2 ? <h2 key={key}>{children}</h2> : level === 3 ? <h3 key={key}>{children}</h3> : <h4 key={key}>{children}</h4>;
    }
    case 'bulletList': return <ul key={key}>{children}</ul>;
    case 'orderedList': return <ol key={key}>{children}</ol>;
    case 'listItem': return <li key={key}>{children}</li>;
    case 'blockquote': return <blockquote key={key}>{children}</blockquote>;
    case 'horizontalRule': return <hr key={key} />;
    case 'image': return node.attrs?.src ? (
      <figure key={key}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={node.attrs.src} alt={node.attrs.alt ?? ''} />
        {node.attrs.title && <figcaption>{node.attrs.title}</figcaption>}
      </figure>
    ) : null;
    default: return <span key={key}>{children}</span>;
  }
}

export default function ArticlePreview({
  open, onClose, title, chapter, cover, content, category, author, publishedAt, readingTime,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  chapter: string;
  cover: string;
  content: unknown;
  category: string;
  author: string;
  publishedAt?: string;
  readingTime: number;
}) {
  const [mobile, setMobile] = useState(false);
  if (!open) return null;

  return (
    <div className="admin-modal-backdrop preview-backdrop" onClick={onClose}>
      <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="preview-head">
          <h2>Aperçu du rendu public</h2>
          <div className="preview-head-actions">
            <button type="button" className={'admin-icon-btn' + (!mobile ? ' is-active' : '')} onClick={() => setMobile(false)} aria-label="Aperçu desktop"><Monitor size={16} /></button>
            <button type="button" className={'admin-icon-btn' + (mobile ? ' is-active' : '')} onClick={() => setMobile(true)} aria-label="Aperçu mobile"><Smartphone size={16} /></button>
            <button type="button" className="admin-icon-btn" onClick={onClose} aria-label="Fermer"><X size={16} /></button>
          </div>
        </div>
        <div className={'preview-frame' + (mobile ? ' is-mobile' : '')}>
          <div className="preview-site-header">
            <TvPlusLogo />
            <span>Présidence · Politique · International · Société · Économie</span>
          </div>
          <article className="preview-article">
            <span className="preview-category">{category || 'Actualité'}</span>
            <h1>{title || 'Titre de l’article'}</h1>
            {chapter && <p className="preview-chapter">{chapter}</p>}
            <div className="preview-meta">{author || 'La rédaction'} · {publishedAt ? new Date(publishedAt).toLocaleDateString('fr-FR') : 'Brouillon'} · {readingTime} min de lecture</div>
            {cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="preview-cover" src={cover} alt="" />
            )}
            <div className="preview-prose">
              {content && typeof content === 'object' && 'content' in content
                ? (content as Node).content?.map((node, i) => renderNode(node, i))
                : <p>Le contenu apparaîtra ici après rédaction.</p>}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
