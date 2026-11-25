import {NextRequest} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {newsroom} from '../../../../lib/admin-v2/lws';
import {ApiError,handleRoute,ok} from '../../../../lib/api/response';
import {paymentConfig,type PaymentOrder} from '../../../../lib/payments/singpay';
import {reconcileOrder} from '../../../../lib/payments/reconcile';
export const dynamic='force-dynamic';
export const maxDuration=60;
const system={id:'payment-service',permissions:[]};
function authorized(req:NextRequest){
 const secret=process.env.PAYMENT_RECONCILE_SECRET||'',token=req.headers.get('authorization')||'';
 const a=Buffer.from('Bearer '+secret),b=Buffer.from(token);
 return secret.length>=32&&a.length===b.length&&timingSafeEqual(a,b);
}
const run=handleRoute(async(req:NextRequest)=>{
 if(!authorized(req))throw new ApiError('Accès refusé.',401,'UNAUTHORIZED');
 const c=paymentConfig();
 if(!c.credentialsReady||!c.environmentMatches||!c.wallet)throw new ApiError('Rapprochement indisponible.',503,'UNAVAILABLE');
 const {orders}=await newsroom<{orders:PaymentOrder[]}>(system,'payments.claim_due',{data:{wallet:c.wallet,mode:c.mode}});
 const results=await Promise.allSettled(orders.map(reconcileOrder));
 return ok({checked:results.length,paid:results.filter(r=>r.status==='fulfilled'&&r.value.state==='paid').length,errors:results.filter(r=>r.status==='rejected').length});
});
export const GET=run;
export const POST=run;
