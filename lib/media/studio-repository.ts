import 'server-only';
import { ApiError } from '../api/response';
import { createAuthClient } from '../auth/server';
import { blankMeta, canEditStudioState, metaSchema, states, type StudioForm, type StudioItem, type StudioKind, type StudioList, type StudioState } from './studio-types';

const fields = 'id,kind,title,description,category,source_url,thumbnail_url,duration_seconds,studio_meta,studio_state,studio_revision,status,published_at,updated_at';
const pageSize = 20;

type StudioRow = Omit<StudioItem, 'revision' | 'state' | 'studio_meta' | 'source_url' | 'thumbnail_url'> & {
  status: string;
  studio_revision: number;
  studio_state: StudioState | null;
  studio_meta: unknown;
  source_url: string | null;
  thumbnail_url: string | null;
};

function toItem(row: StudioRow): StudioItem {
  const { studio_state, studio_revision, status, ...item } = row;
  const due = item.published_at !== null && Date.parse(item.published_at) <= Date.now();
  let state = studio_state;
  if (state === 'scheduled' && due) state = 'published';
  if (!state) state = status === 'published' ? (due ? 'published' : 'scheduled') : status === 'archived' ? 'archived' : 'draft';
  return {
    ...item,
    source_url: item.source_url ?? '',
    thumbnail_url: item.thumbnail_url ?? '',
    studio_meta: metaSchema.safeParse(item.studio_meta).data ?? blankMeta(),
    revision: studio_revision,
    state,
  };
}

function databaseError(error: { code: string }) {
  if (error.code === '42501') return new ApiError('Opération refusée par le Studio.', 403, 'UNAUTHORIZED');
  if (error.code === '23514') return new ApiError('Vérifiez les informations du contenu et sa date de publication.', 400);
  return new ApiError('Le catalogue du Studio est temporairement indisponible.', 503, 'UNAVAILABLE');
}

export async function getStudioItem(kind: StudioKind, id: string) {
  const db = await createAuthClient();
  const { data, error } = await db.from('editorial_media').select(fields).eq('kind', kind).eq('id', id).maybeSingle();
  if (error) throw databaseError(error);
  if (!data) throw new ApiError('Contenu introuvable.', 404, 'NOT_FOUND');
  return toItem(data as StudioRow);
}

export async function listStudioItems(kind: StudioKind, state: StudioState | 'all', q: string, page: number): Promise<StudioList> {
  const db = await createAuthClient();
  const now = new Date().toISOString();
  const filterByState = (value: StudioState) => {
    if (value === 'published') return 'studio_state.eq.published,and(studio_state.eq.scheduled,published_at.lte.' + now + ')';
    if (value === 'scheduled') return 'and(studio_state.eq.scheduled,published_at.gt.' + now + ')';
    return 'studio_state.eq.' + value;
  };
  let query = db.from('editorial_media').select(fields, { count: 'exact' }).eq('kind', kind);
  if (state !== 'all') query = query.or(filterByState(state));
  const search = q.trim().replace(/[\\%_*"]/g, '\\$&');
  if (search) query = query.or(['title', 'description', 'category'].map(field => field + '.ilike."%' + search + '%"').join(','));
  const start = (page - 1) * pageSize;
  const [result, ...totals] = await Promise.all([
    query.order(state === 'scheduled' ? 'published_at' : 'updated_at', { ascending: state === 'scheduled' }).order('id').range(start, start + pageSize - 1),
    ...states.map(value => db.from('editorial_media').select('id', { count: 'exact', head: true }).eq('kind', kind).or(filterByState(value))),
  ]);
  if (result.error) throw databaseError(result.error);
  const counts: StudioList['counts'] = {};
  totals.forEach(({ count, error }, index) => {
    if (error) throw databaseError(error);
    counts[states[index]] = count ?? 0;
  });
  return { items: (result.data as StudioRow[]).map(toItem), total: result.count ?? 0, page, pageSize, counts };
}

export async function saveStudioItem(form: StudioForm) {
  const { id, revision, ...values } = form;
  const db = await createAuthClient();
  if (id) {
    const current = await getStudioItem(form.kind, id);
    if (current.revision !== revision) throw conflict();
    if (!canEditStudioState(current.state)) {
      throw new ApiError('Archivez le contenu avant de le modifier.', 409, 'CONFLICT');
    }
    return updateStudioItem(form.kind, id, current.revision, { ...values, studio_state: current.state });
  }
  const { data, error } = await db.from('editorial_media').insert({ ...values, studio_state: 'draft' }).select(fields).single();
  if (error) throw databaseError(error);
  return toItem(data as StudioRow);
}

export function conflict() {
  return new ApiError('Ce contenu a été modifié. Rechargez la page.', 409, 'CONFLICT');
}

export async function updateStudioItem(kind: StudioKind, id: string, revision: number, values: Partial<StudioForm> & {
  studio_state: StudioState;
  published_at?: string | null;
}) {
  const db = await createAuthClient();
  const { data, error } = await db.from('editorial_media').update(values).eq('id', id).eq('kind', kind)
    .eq('studio_revision', revision).select(fields).maybeSingle();
  if (error) throw databaseError(error);
  if (!data) throw conflict();
  return toItem(data as StudioRow);
}
