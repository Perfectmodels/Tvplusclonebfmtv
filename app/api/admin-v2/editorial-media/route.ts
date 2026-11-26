import {requireV2Api} from '../../../../lib/auth/v2-admin';
import {newsroom} from '../../../../lib/admin-v2/lws';
import {ApiError,handleRoute,ok} from '../../../../lib/api/response';
export const dynamic='force-dynamic';
// Compatibilité en lecture. Les écritures passent par le Studio et ses transitions.
export const GET=handleRoute(async()=>{const {actor}=await requireV2Api('shows.manage');return ok(await newsroom(actor,'catalog.list'));});
export const POST=handleRoute(async()=>{await requireV2Api('shows.manage');throw new ApiError('Utilisez le Studio audiovisuel.',409,'CONFLICT');});
export const PATCH=POST;
