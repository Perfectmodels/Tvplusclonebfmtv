import 'server-only';
import {z} from 'zod';
import {ApiError} from '../api/response';
const BASE='https://gateway.singpay.ga/v1';
export function paymentConfig(){
 const clientId=process.env.SINGPAY_CLIENT_ID?.trim(),clientSecret=process.env.SINGPAY_CLIENT_SECRET?.trim(),wallet=process.env.SINGPAY_WALLET_ID?.trim(),disbursement=process.env.SINGPAY_DISBURSEMENT_ID?.trim();
 const returnOrigin=process.env.SINGPAY_RETURN_ORIGIN?.trim();
 const allowedHosts=(process.env.SINGPAY_CHECKOUT_HOSTS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
 let origin:string|undefined;
 try{const u=new URL(returnOrigin||'');if(u.protocol==='https:'&&!u.username&&!u.password&&u.pathname==='/'&&!u.search&&!u.hash)origin=u.origin;}catch{}
 const configured=!!(clientId&&clientSecret&&wallet&&origin&&allowedHosts.length&&(process.env.SINGPAY_MODE==='sandbox'||(process.env.SINGPAY_MODE==='production'&&disbursement)));
 return {clientId,clientSecret,wallet,disbursement,origin,allowedHosts,configured,enabled:configured&&process.env.SINGPAY_ENABLED==='true',mode:process.env.SINGPAY_MODE||'unconfigured'};
}
async function request(path:string,body?:unknown){
 const c=paymentConfig();if(!c.configured)throw new ApiError('Configuration SingPay incomplète.',503,'UNAVAILABLE');
 let response:Response;
 try{response=await fetch(BASE+path,{method:body===undefined?'GET':'POST',headers:{'x-client-id':c.clientId!,'x-client-secret':c.clientSecret!,'x-wallet':c.wallet!,'Content-Type':'application/json',Accept:'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)});}catch{throw new ApiError('SingPay ne répond pas. Vérifiez la transaction avant toute nouvelle tentative.',503,'UNAVAILABLE');}
 if(response.status===404&&body===undefined)return null;
 if(!response.ok)throw new ApiError('SingPay a refusé la requête. Vérifiez la transaction avant toute nouvelle tentative.',502,'UNAVAILABLE');
 try{return await response.json();}catch{throw new ApiError('Réponse SingPay illisible.',502,'UNAVAILABLE');}
}
export type PaymentOrder={reference:string;plan_slug:string;plan_name:string;amount:number|string;duration_minutes:number|string;wallet_id:string;mode:'sandbox'|'production';state:'reserved'|'pending'|'paid'|'failed'|'review';checkout_url?:string|null;checkout_expires_at?:string|null;entitlement_ends_at?:string|null;provider_id?:string|null};
export function checkoutUrl(value:string){const u=new URL(value);const c=paymentConfig();if(u.protocol!=='https:'||u.username||u.password||u.port||!c.allowedHosts.includes(u.hostname.toLowerCase()))throw new ApiError('Hôte de paiement non autorisé. Contactez le support.',502,'UNAVAILABLE');return u.href;}
export async function createCheckout(order:PaymentOrder){
 const c=paymentConfig();if(!c.enabled||(order.wallet_id!==c.wallet||order.mode!==c.mode))throw new ApiError('Paiements indisponibles.',503,'UNAVAILABLE');
 const back=c.origin+'/direct/paiement?reference='+encodeURIComponent(order.reference);
 const data=await request('/ext',{portefeuille:c.wallet,reference:order.reference,amount:Number(order.amount),redirect_success:back,redirect_error:back,...(c.disbursement?{disbursement:c.disbursement}:{}),isTransfer:false});
 const r=z.object({link:z.string().min(1).max(2500),exp:z.string().optional()}).safeParse(data);
 if(!r.success)throw new ApiError('Lien SingPay non reconnu. Vérifiez la transaction.',502,'UNAVAILABLE');
 const expiration=Date.parse(r.data.exp||'');
 return {url:checkoutUrl(r.data.link),expiresAt:Number.isFinite(expiration)?new Date(expiration).toISOString():null};
}
const transaction=z.object({id:z.string().min(1).max(200),reference:z.string(),status:z.string(),result:z.string().nullish(),amount:z.union([z.string(),z.number()]),portefeuille:z.object({id:z.string().optional(),_id:z.string().optional()})});
export async function verifyOrder(order:PaymentOrder){
 const c=paymentConfig();if(order.wallet_id!==c.wallet)throw new ApiError('Portefeuille différent. Vérification manuelle requise.',409,'CONFLICT');
 const data=await request('/transaction/api/search/by-reference/'+encodeURIComponent(order.reference));
 if(data===null)return {state:'pending' as const};
 const direct=transaction.safeParse(data);
 const nested=transaction.safeParse(data?.transaction);
 const result=direct.success?direct:nested;
 if(!result.success)return {state:'review' as const};
 const t=result.data;
 if(t.reference!==order.reference||![t.portefeuille.id,t.portefeuille._id].includes(order.wallet_id)||!/^\d+(?:\.0+)?$/.test(String(t.amount))||Number(t.amount)!==Number(order.amount)||(order.provider_id&&order.provider_id!==t.id))return {state:'review' as const};
 if(t.status==='Terminate'&&t.result==='Success')return {state:'paid' as const,providerId:t.id};
 if(t.status==='Terminate'&&['PasswordError','BalanceError','TimeOutError','Error'].includes(t.result||''))return {state:'failed' as const,providerId:t.id};
 if(t.status==='Refund'||t.status==='Disbursement')return {state:'review' as const};
 return {state:'pending' as const};
}
