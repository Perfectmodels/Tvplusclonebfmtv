import {handleRoute,ApiError} from '../../../../lib/api/response';
export const dynamic='force-dynamic';
export const POST=handleRoute(async()=>{throw new ApiError('Réinitialisation par e-mail non configurée. Contactez un administrateur.',503,'UNAVAILABLE');});
