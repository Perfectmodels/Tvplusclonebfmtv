import 'server-only';
import { z } from 'zod';
import { ApiError } from '../api/response';
import { videoEmbedUrl } from './providers';
import type {
  SproutVideo,
  SproutVideoPage,
  SproutVideoState,
  SproutVideoUploadToken,
} from './sproutvideo-types';

const API_ORIGIN = 'https://api.sproutvideo.com/v1';
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 12;

const videoSchema = z.object({
  id: z.string().min(6).max(64),
  security_token: z.string().min(6).max(128).nullish(),
  title: z.string().nullish(),
  state: z.string().min(1).max(40),
  progress: z.number().nullish(),
  requires_signed_embeds: z.boolean().nullish(),
  duration: z.number().nullish(),
  width: z.number().nullish(),
  height: z.number().nullish(),
  created_at: z.string().nullish(),
  selected_poster_frame_number: z.number().int().nullish(),
  assets: z.object({
    thumbnails: z.array(z.string().nullable()).nullish(),
    poster_frames: z.array(z.string().nullable()).nullish(),
  }).nullish(),
});

const videoPageSchema = z.object({
  videos: z.array(z.unknown()),
  next_page: z.string().nullish(),
  total: z.coerce.number().nullish(),
});

const uploadTokenSchema = z.object({
  // SproutVideo a renommé ce champ selon les versions de l'API.
  token: z.string().min(16).max(200).nullish(),
  upload_token: z.string().min(16).max(200).nullish(),
  expires_at: z.string().nullish(),
  seconds_valid: z.number().nullish(),
});

function unavailable() {
  return new ApiError('La bibliothèque SproutVideo est temporairement indisponible.', 502, 'UNAVAILABLE');
}

function apiKey() {
  const key = process.env.SPROUTVIDEO_API_KEY?.trim();
  if (!key) {
    throw new ApiError('La vidéothèque SproutVideo doit être configurée sur le serveur.', 503, 'UNAVAILABLE');
  }
  return key;
}

async function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('SproutVideo-Api-Key', apiKey());
  headers.set('Accept', 'application/json');
  if (typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(API_ORIGIN + path, {
      ...init,
      headers,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw unavailable();
  }

  if (response.status === 429) {
    throw new ApiError('SproutVideo limite les requêtes. Réessayez dans un instant.', 429, 'RATE_LIMITED');
  }
  if (response.status === 401 || response.status === 403) {
    throw new ApiError('La clé API SproutVideo est invalide ou expirée.', 503, 'UNAVAILABLE');
  }
  if (response.status === 404) {
    throw new ApiError('Vidéo introuvable dans SproutVideo.', 404, 'NOT_FOUND');
  }
  if (response.status === 413) {
    throw new ApiError('Le stockage SproutVideo est saturé ou le fichier dépasse la limite du forfait.', 400, 'BAD_REQUEST');
  }
  if (response.status === 415) {
    throw new ApiError('Format vidéo non pris en charge par SproutVideo.', 400, 'BAD_REQUEST');
  }
  if (!response.ok) throw unavailable();

  const body = await response.json().catch(() => null);
  if (!body) throw unavailable();
  return body as unknown;
}

function safeThumbnail(value: string | null | undefined) {
  if (!value || value.length > 1300) return '';
  try {
    const url = new URL(value);
    if (url.origin === 'https://images.sproutvideo.com' && !url.username && !url.password) {
      return url.href;
    }
  } catch {
    return '';
  }
  return '';
}

function state(value: string): SproutVideoState {
  if (value === 'deployed' || value === 'processing' || value === 'inspecting' || value === 'failed') {
    return value;
  }
  return 'processing';
}

export function mapSproutVideo(value: unknown): SproutVideo | null {
  const parsed = videoSchema.safeParse(value);
  if (!parsed.success) return null;
  const video = parsed.data;
  const token = video.security_token?.trim() ?? '';
  const sourceUrl = token ? videoEmbedUrl('sproutvideo', video.id + '/' + token) : '';
  const posterFrames = (video.assets?.poster_frames ?? video.assets?.thumbnails ?? [])
    .map(value => safeThumbnail(value))
    .filter((value): value is string => Boolean(value))
    .slice(0, 4);
  const frame = Math.max(0, Math.min(posterFrames.length - 1, video.selected_poster_frame_number ?? 0));
  const cover = safeThumbnail(video.assets?.poster_frames?.[frame]) ||
    safeThumbnail(video.assets?.thumbnails?.[frame]) ||
    posterFrames[0] || '';
  const duration = Math.round(video.duration ?? 0);
  const progress = Math.max(0, Math.min(100, Math.round(video.progress ?? 0)));
  return {
    id: video.id,
    title: video.title?.trim().slice(0, 200) || 'Vidéo sans titre',
    sourceUrl,
    thumbnailUrl: cover,
    durationSeconds: duration > 0 && duration <= 864000 ? duration : null,
    vertical: !!video.width && !!video.height && video.height > video.width,
    state: state(video.state.toLowerCase()),
    progress,
    createdAt: video.created_at && Number.isFinite(Date.parse(video.created_at)) ? new Date(video.created_at).toISOString() : null,
    requiresSignedEmbeds: Boolean(video.requires_signed_embeds),
    posterFrames,
    posterFrameIndex: frame,
  };
}

export async function listSproutVideos(page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<SproutVideoPage> {
  const safePage = Math.min(10_000, Math.max(1, Math.trunc(page) || 1));
  const safeSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(pageSize) || DEFAULT_PAGE_SIZE));
  const query = new URLSearchParams({
    state: 'deployed',
    order_by: 'created_at',
    order_dir: 'desc',
    per_page: String(safeSize),
    page: String(safePage),
  });
  const body = await request('/videos?' + query.toString());
  const parsed = videoPageSchema.safeParse(body);
  if (!parsed.success) throw unavailable();
  const items = parsed.data.videos.flatMap(value => {
    const video = mapSproutVideo(value);
    return video ? [video] : [];
  });
  return {
    items,
    hasNext: Boolean(parsed.data.next_page),
    total: Math.max(0, Math.trunc(parsed.data.total ?? items.length)),
    page: safePage,
    pageSize: safeSize,
  };
}

export async function getSproutVideo(id: string): Promise<SproutVideo> {
  const body = await request('/videos/' + encodeURIComponent(id));
  const video = mapSproutVideo(body);
  if (!video) throw unavailable();
  return video;
}

export async function updateSproutVideo(id: string, values: { title?: string; posterframe_number?: number }): Promise<SproutVideo> {
  const body = await request('/videos/' + encodeURIComponent(id), {
    method: 'PUT',
    body: JSON.stringify(values),
  });
  const video = mapSproutVideo(body);
  if (!video) throw unavailable();
  return video;
}

export async function deleteSproutVideo(id: string): Promise<void> {
  await request('/videos/' + encodeURIComponent(id), { method: 'DELETE' });
}

export async function createSproutUploadToken(): Promise<SproutVideoUploadToken> {
  const body = await request('/upload_tokens', {
    method: 'POST',
    body: JSON.stringify({
      seconds_valid: 3_600,
      allowed_inputs: ['title'],
      // Les vidéos publiées sur le site doivent rester intégrables sans signature.
      preset_values: {
        privacy: 2,
        requires_signed_embeds: false,
      },
    }),
  });
  const parsed = uploadTokenSchema.safeParse(body);
  if (!parsed.success) throw unavailable();
  const token = parsed.data.token || parsed.data.upload_token;
  if (!token) throw unavailable();
  return {
    token,
    expiresAt: parsed.data.expires_at && Number.isFinite(Date.parse(parsed.data.expires_at))
      ? new Date(parsed.data.expires_at).toISOString()
      : null,
  };
}
