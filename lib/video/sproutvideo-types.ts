export const sproutVideoKinds = ['replay', 'reel', 'reportage'] as const;
export type SproutVideoKind = (typeof sproutVideoKinds)[number];
export type SproutVideoState = 'inspecting' | 'processing' | 'deployed' | 'failed';

export type SproutVideo = {
  id: string;
  title: string;
  sourceUrl: string;
  thumbnailUrl: string;
  durationSeconds: number | null;
  vertical: boolean;
  state: SproutVideoState;
  progress: number;
  createdAt: string | null;
  requiresSignedEmbeds: boolean;
  posterFrames: string[];
  posterFrameIndex: number;
};

export type SproutVideoPage = {
  items: SproutVideo[];
  hasNext: boolean;
  total: number;
  page: number;
  pageSize: number;
};

export type SproutVideoUploadToken = {
  token: string;
  expiresAt: string | null;
};

/** Permissions autorisées pour la vidéothèque et ses actions. */
export function sproutPermissions(kind?: SproutVideoKind | null): string[] {
  if (kind === 'replay') return ['shows.manage'];
  if (kind === 'reel' || kind === 'reportage') return ['shows.manage', 'studio.' + kind + '_manage'];
  return ['shows.manage', 'studio.reel_manage', 'studio.podcast_manage', 'studio.reportage_manage'];
}

export function isSproutVideoKind(value: unknown): value is SproutVideoKind {
  return typeof value === 'string' && (sproutVideoKinds as readonly string[]).includes(value);
}

export function sproutSelectable(video: Pick<SproutVideo, 'state' | 'requiresSignedEmbeds' | 'sourceUrl'>): boolean {
  return video.state === 'deployed' && !video.requiresSignedEmbeds && Boolean(video.sourceUrl);
}

export function sproutStateLabel(state: SproutVideoState): string {
  if (state === 'deployed') return 'Prête';
  if (state === 'failed') return 'Échec du traitement';
  if (state === 'inspecting') return 'Vérification';
  return 'Traitement en cours';
}
