import {NextRequest} from 'next/server';
import {z} from 'zod';
import {getV2Actor} from '../../../../lib/auth/v2-admin';
import {newsroom} from '../../../../lib/admin-v2/lws';
import {ApiError,handleRoute,ok} from '../../../../lib/api/response';
import {rateLimit} from '../../../../lib/api/rate-limit';
import {paymentConfig,type PaymentOrder} from '../../../../lib/payments/singpay';
import {reconcileOrder} from '../../../../lib/payments/reconcile';
import {playbackConfig} from '../../../../lib/video/premium';
export const dynamic='force-dynamic';
export const maxDuration=60;
async function actor(){const a=await getV2Actor();if(!a)throw new ApiError('Connexion requise.',401,'UNAUTHORIZED');if(!a.permissions.includes('settings.manage'))throw new ApiError('Permission insuffisante.',403,'UNAUTHORIZED');return a;}
const plan=z.object({slug:z.string().regex(/^[a-z0-9-]{1,50}$/),name:z.string().trim().min(2).max(100),amount:z.number().int().min(1).max(1000000),duration_minutes:z.number().int().min(1).max(525600),active:z.boolean()});
export const GET=handleRoute(async()=>{
 const a=await actor(),c=paymentConfig(),video=playbackConfig();
 const r=await newsroom<Record<string,unknown>>(a,'payments.admin');
 const activePlans=Array.isArray(r.plans)?r.plans.filter(p=>p&&typeof p==='object'&&'active' in p&&Number(p.active)===1).length:0;
 return ok({...r,configured:c.configured,enabled:c.enabled&&(c.mode==='sandbox'||video.ready)&&activePlans>0,mode:c.mode,readiness:{credentials:c.credentialsReady,returnOrigin:!!c.origin,checkoutHosts:c.allowedHosts.length>0,playbackConfigured:video.configured,playbackVerified:video.verified,goLiveConfirmed:c.mode==='sandbox'||c.goLiveConfirmed,environmentMatches:c.environmentMatches,reconciliationSecret:(process.env.PAYMENT_RECONCILE_SECRET||'').length>=32,activePlans,switchEnabled:process.env.SINGPAY_ENABLED==='true'}});
});
export const POST=handleRoute(async(req:NextRequest)=>{
 const a=await actor();if(req.headers.get('origin')!==req.nextUrl.origin)throw new ApiError('Origine refusée.',403,'UNAUTHORIZED');
 rateLimit(req,{prefix:'premium-admin',limit:12,windowMs:60000});
 const raw=await req.json().catch(()=>null);
 if(raw?.action==='reconcile'){
  const parsed=z.object({reference:z.string().uuid()}).safeParse(raw);if(!parsed.success)throw new ApiError('Référence invalide.',400);
  const {order}=await newsroom<{order:PaymentOrder}>(a,'payments.admin_get',{data:parsed.data});
  const result=await reconcileOrder(order);return ok({reference:result.reference,state:result.state,mode:result.mode});
 }
 const p=plan.safeParse(raw);if(!p.success)throw new ApiError('Offre invalide.',400);
 return ok(await newsroom(a,'payments.plan_save',{data:p.data}));
});
