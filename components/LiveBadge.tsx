import type { StoryKind } from '../lib/data';

const LABELS: Record<StoryKind, string> = {
  live: 'Live en cours',
  alert: 'Alerte info',
  video: 'Vidéo',
  direct: 'Direct',
};

export default function LiveBadge({ kind, light = false }: { kind?: StoryKind; light?: boolean }) {
  if (!kind) return null;
  return (
    <span className={'kind-label kind-' + kind + (light ? ' is-light' : '')}>
      {LABELS[kind]}
    </span>
  );
}
