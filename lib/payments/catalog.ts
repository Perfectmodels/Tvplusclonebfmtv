import 'server-only';
import {z} from 'zod';
import {ApiError} from '../api/response';
import {newsroom} from '../admin-v2/lws';
export const settingsSchema=z.object({checkout_enabled:z.boolean(),golive_confirmed:z.boolean(),checkout_hosts:z.string().max(1500),return_origin:z.string().max(300)});
export type PremiumSettings=z.infer<typeof settingsSchema>;
export const emptySettings:PremiumSettings={checkout_enabled:false,golive_confirmed:false,checkout_hosts:'',return_origin:''};
const plan=z.object({slug:z.string(),name:z.string(),amount:z.coerce.number().int().positive(),duration_minutes:z.coerce.number().int().positive()});
const catalog=z.object({plans:z.array(plan),settings:settingsSchema});
export async function premiumCatalog(){
 // Lecture publique, indépendante du compte et du contrôle d'accès au flux.
 const endpoint=process.env.LWS_EDITORIAL_API_URL;
 if(!endpoint)throw new ApiError('Catalogue des offres non raccordé.',503,'UNAVAILABLE');
 try{const url=new URL(endpoint);if(url.protocol!=='https:'||url.username||url.password)throw Error();url.searchParams.set('resource','premium_plans');
 const res=await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000)});
 if(res.ok){const p=catalog.safeParse(await res.json());if(p.success)return p.data;}
 }catch{}
 // Compatibilité transitoire : même catalogue via le service privé, jamais de données inventées.
 try{return catalog.parse(await newsroom({id:'public',permissions:[]},'payments.plans'));}catch{throw new ApiError('Catalogue Premium non raccordé à l’API PHP LWS. Le paiement est temporairement indisponible.',503,'UNAVAILABLE');}
}
