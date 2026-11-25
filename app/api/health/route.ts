import {readLwsResource} from '../../../lib/db/lws-public';
import {ok,fail} from '../../../lib/api/response';
export const dynamic='force-dynamic';
export async function GET(){try{const r=await readLwsResource<{status:string}>('health');if(r.status!=='ok')throw Error('health');return ok({status:'ok',database:'ready',provider:'mysql-lws',schema:'tvplus-v3'});}catch{return fail('Service éditorial MySQL indisponible.',503,'UNAVAILABLE');}}
