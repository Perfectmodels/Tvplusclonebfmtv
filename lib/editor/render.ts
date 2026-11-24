/**
 * Convertit un document Tiptap JSON en HTML sûr pour le site public.
 * Seuls les nœuds et marques explicitement autorisés sont rendus.
 * Aucun HTML arbitraire provenant du client n'est jamais inséré tel quel.
 */

import { parseVideoUrl, videoEmbedUrl } from '../video/providers';

type Node = { type?: string; text?: string; attrs?: Record<string, any>; content?: Node[]; marks?: { type?: string; attrs?: Record<string, any> }[] };

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeUrl(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  if (!value) return null;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const url = new URL(value);
    if (['http:', 'https:', 'mailto:'].includes(url.protocol)) return url.toString();
  } catch {
    return null;
  }
  return null;
}

const FONTS = new Set(['Barlow', 'Arial', 'Georgia', 'Times New Roman', 'Verdana']);
const SIZES = new Set(['12', '14', '16', '18', '20', '24', '28', '32', '36']);

function applyMarks(text: string, marks: Node['marks'] = []): string {
  let output = text;
  for (const mark of marks) {
    switch (mark.type) {
      case 'editorialTextStyle': {
        const attrs = mark.attrs ?? {};
        const styles: string[] = [];
        if (typeof attrs.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(attrs.color))
          styles.push('color:' + attrs.color);
        if (typeof attrs.fontFamily === 'string' && FONTS.has(attrs.fontFamily))
          styles.push("font-family:'" + attrs.fontFamily + "'");
        if (typeof attrs.fontSize === 'string' && SIZES.has(attrs.fontSize))
          styles.push('font-size:' + attrs.fontSize + 'px');
        if (styles.length) output = `<span style="${escapeHtml(styles.join(';'))}">${output}</span>`;
        break;
      }
      case 'bold': output = `<strong>${output}</strong>`; break;
      case 'italic': output = `<em>${output}</em>`; break;
      case 'underline': output = `<u>${output}</u>`; break;
      case 'strike': output = `<s>${output}</s>`; break;
      case 'code': output = `<code>${output}</code>`; break;
      case 'link': {
        const href = safeUrl(mark.attrs?.href);
        output = href
          ? `<a href="${escapeHtml(href)}" rel="noopener noreferrer" target="_blank">${output}</a>`
          : output;
        break;
      }
      default: break;
    }
  }
  return output;
}

function renderNode(node: Node): string {
  switch (node.type) {
    case 'text':
      return applyMarks(escapeHtml(node.text ?? ''), node.marks);
    case 'paragraph':
      return `<p>${(node.content ?? []).map(renderNode).join('')}</p>`;
    case 'heading': {
      const raw = Number(node.attrs?.level ?? 2);
      const level = [2, 3, 4].includes(raw) ? raw : 2;
      return `<h${level}>${(node.content ?? []).map(renderNode).join('')}</h${level}>`;
    }
    case 'bulletList':
      return `<ul>${(node.content ?? []).map(renderNode).join('')}</ul>`;
    case 'orderedList':
      return `<ol>${(node.content ?? []).map(renderNode).join('')}</ol>`;
    case 'listItem':
      return `<li>${(node.content ?? []).map(renderNode).join('')}</li>`;
    case 'blockquote':
      return `<blockquote>${(node.content ?? []).map(renderNode).join('')}</blockquote>`;
    case 'horizontalRule':
      return '<hr />';
    case 'hardBreak':
      return '<br />';
    case 'codeBlock':
      return `<pre><code>${(node.content ?? []).map(renderNode).join('')}</code></pre>`;
    case 'image': {
      const src = safeUrl(node.attrs?.src);
      if (!src) return '';
      const alt = escapeHtml(String(node.attrs?.alt ?? ''));
      const caption = String(node.attrs?.title ?? '');
      const figure = `<img src="${escapeHtml(src)}" alt="${alt}" loading="lazy" />`;
      return caption ? `<figure>${figure}<figcaption>${escapeHtml(caption)}</figcaption></figure>` : figure;
    }
    case 'youtube': {
      const src = typeof node.attrs?.src === 'string' ? node.attrs.src : '';
      const normalized = src.replace(/^https:\/\/www\.youtube-nocookie\.com\/embed\//,'https://www.youtube.com/embed/');
      const video = parseVideoUrl(normalized);
      if (!video || video.platform !== 'youtube') return '';
      const embed = videoEmbedUrl(video.platform,video.externalId,video.url);
      return `<div class="article-video"><iframe src="${escapeHtml(embed)}" title="Vidéo" allowfullscreen loading="lazy"></iframe></div>`;
    }
    case 'doc':
    case 'root':
      return (node.content ?? []).map(renderNode).join('');
    default:
      return (node.content ?? []).map(renderNode).join('');
  }
}

export function renderTiptapHtml(doc: unknown): string {
  if (!doc || typeof doc !== 'object') return '';
  return renderNode(doc as Node);
}

export function countWords(doc: unknown): number {
  let count = 0;
  const walk = (node: Node) => {
    if (node.type === 'text' && node.text) count += node.text.trim().split(/\s+/).filter(Boolean).length;
    node.content?.forEach(walk);
  };
  if (doc && typeof doc === 'object') walk(doc as Node);
  return count;
}

export function readingTime(words: number): number {
  return Math.max(1, Math.round(words / 220));
}
