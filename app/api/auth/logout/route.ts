import {NextRequest} from 'next/server';
import {handleRoute,ok,ApiError} from '../../../../lib/api/response';
import {clearRecovery} from '../../../../lib/auth/recovery';
import {clearSession} from '../../../../lib/auth/session';
import {createAuthClient} from '../../../../lib/auth/server';
export const dynamic='force-dynamic';
export const POST=handleRoute(async(req:NextRequest)=>{if(req.headers.get('origin')!==req.nextUrl.origin)throw new ApiError('Origine refusée.',403,'UNAUTHORIZED');const db=await createAuthClient();const {error}=await db.auth.signOut({scope:'local'});await clearSession();await clearRecovery();if(error)throw new ApiError('Déconnexion Supabase indisponible.',503,'UNAVAILABLE');return ok({signedOut:true});});
