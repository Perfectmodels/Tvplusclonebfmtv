import {handleRoute,ok} from '../../../../lib/api/response';
import {clearSession} from '../../../../lib/auth/session';
export const dynamic='force-dynamic';
export const POST=handleRoute(async()=>{await clearSession();return ok({signedOut:true});});
