import {handleRoute,ok,ApiError} from '../../../../lib/api/response';
import {clearSession} from '../../../../lib/auth/session';
import {createAuthClient} from '../../../../lib/auth/server';
export const dynamic='force-dynamic';
export const POST=handleRoute(async()=>{const db=await createAuthClient();const {error}=await db.auth.signOut({scope:'local'});await clearSession();if(error)throw new ApiError('Déconnexion Supabase indisponible.',503,'UNAVAILABLE');return ok({signedOut:true});});
