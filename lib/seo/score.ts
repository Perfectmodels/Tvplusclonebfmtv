type Draft = {
  title: string;
  description: string;
  words: number;
  headings: number;
  keywords: number;
  sources: number;
  internalLinks: number;
  cover: boolean;
  coverAlt: boolean;
  classified: boolean;
  validSlug: boolean;
  excerpt: string;
};

export function seoScore(draft: Draft) {
  const checks = [
    { label: 'Métadonnées', points: 15, earned: (draft.title.trim().length >= 15 ? 7 : 0) + (draft.description.trim().length >= 70 && draft.description.trim().length <= 165 ? 8 : 0), tip: 'Vérifiez que le titre décrit le sujet et que la description fait entre 70 et 165 caractères.' },
    { label: 'Structure éditoriale', points: 15, earned: (draft.words >= 50 ? 8 : 0) + (draft.words >= 50 && (draft.words < 250 || draft.headings > 0) ? 7 : 0), tip: 'Vérifiez que le texte est complet. Ajoutez un intertitre si la longueur le justifie.' },
    { label: 'Repères sémantiques', points: 15, earned: (draft.keywords > 0 ? 8 : 0) + (draft.classified ? 7 : 0), tip: 'Renseignez une rubrique, un pays et les mots-clés du sujet.' },
    { label: 'Sources et transparence', points: 15, earned: draft.sources > 0 ? 15 : 0, tip: 'Ajoutez un lien de source lorsqu’il peut être rendu public.' },
    { label: 'Maillage interne', points: 10, earned: draft.internalLinks > 0 ? 10 : 0, tip: 'Ajoutez un lien vers un article connexe.' },
    { label: 'Image', points: 10, earned: (draft.cover ? 5 : 0) + (draft.cover && draft.coverAlt ? 5 : 0), tip: 'Choisissez une couverture et renseignez son texte alternatif dans la médiathèque.' },
    { label: 'Conformité technique', points: 10, earned: draft.validSlug ? 10 : 0, tip: 'Vérifiez le slug de l’article.' },
    { label: 'Résumé factuel', points: 5, earned: draft.excerpt.trim().length >= 50 ? 5 : 0, tip: 'Résumez l’information principale dans le chapeau.' },
    { label: 'Partage social', points: 5, earned: draft.cover && draft.title.trim().length > 0 ? 5 : 0, tip: 'Vérifiez le titre et le visuel de l’aperçu de partage.' },
  ];
  return { value: checks.reduce((sum, check) => sum + check.earned, 0), checks };
}

export function seoDocumentMetrics(value: unknown, siteUrl?: string) {
  let headings = 0, sources = 0, internalLinks = 0;
  let siteHost: string | undefined;
  try { siteHost = siteUrl ? new URL(siteUrl).hostname : undefined; } catch {}
  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const item = node as { type?: string; content?: unknown[]; marks?: { type?: string; attrs?: { href?: string } }[] };
    if (item.type === 'heading') headings++;
    for (const mark of item.marks ?? []) {
      const href = mark.attrs?.href;
      if (mark.type !== 'link' || !href) continue;
      if (/^\/(?:a|article)\//.test(href)) internalLinks++;
      else if (/^https?:\/\//i.test(href)) {
        try {
          const url = new URL(href);
          if (siteHost === url.hostname && /^\/(?:a|article)\//.test(url.pathname)) internalLinks++;
          else if (siteHost !== url.hostname) sources++;
        } catch {}
      }
    }
    item.content?.forEach(visit);
  };
  visit(value);
  return { headings, sources, internalLinks };
}
