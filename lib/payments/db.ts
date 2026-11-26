import 'server-only';
import {createClient} from '@supabase/supabase-js';
import {ApiError} from '../api/response';
export async function livePayments<T>(actor:{id:string;permissions:string[]},operation:string,params:Record<string,unknown>={}):Promise<T>{
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new ApiError('Configuration privée du paiement du direct manquante.',503,'UNAVAILABLE');
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const {data,error}=await db.rpc('tvplus_live_payment',{p_actor:actor.id,p_operation:operation,p_data:params.data??{}});
 if(error)throw new ApiError(error.code==='42501'?'Accès refusé.':'Opération de paiement indisponible.',error.code==='42501'?403:503,error.code==='42501'?'UNAUTHORIZED':'UNAVAILABLE');
 return data as T;
}
