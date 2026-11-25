import {NextRequest} from 'next/server';
import {z} from 'zod';
import {getUser} from '../../../../lib/auth/server';
import {newsroom} from '../../../../lib/admin-v2/lws';
import {ApiError,handleRoute,ok} from '../../../../lib/api/response';
import {rateLimit} from '../../../../lib/api/rate-limit';
import {paymentConfig,createCheckout,checkoutUrl,verifyOrder,type PaymentOrder} from '../../../../lib/payments/singpay';
export const dynamic='force-dynamic';
export const maxDuration=60;
const system={id:'payment-service',permissions:[]};
async function actor(){const user=await getUser();if(!user)throw new ApiError('Connectez-vous pour accéder à vos paiements.',401,'UNAUTHORIZED');return {id:user.id,permissions:[]};}
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('checkout'),plan:z.string().regex(/^[a-z0-9-]{1,50}$/),amount:z.number().int().positive(),durationMinutes:z.number().int().positive(),confirmed:z.literal(true)}),
 z.object({action:z.literal('verify'),reference:z.string().uuid()})
]);
function publicOrder(o:PaymentOrder){return {reference:o.reference,plan:o.plan_name,amount:Number(o.amount),state:o.state,mode:o.mode,expiresAt:o.entitlement_ends_at||null};}
export const GET=handleRoute(async()=>{const a=await actor();const data=await newsroom<{orders:PaymentOrder[]}>(a,'payments.mine');return ok({orders:data.orders.map(publicOrder)});});
export const POST=handleRoute(async(req:NextRequest)=>{
 const a=await actor();
 if(req.headers.get('origin')!==req.nextUrl.origin)throw new ApiError('Origine refusée.',403,'UNAUTHORIZED');
 rateLimit(req,{prefix:'premium-payments',limit:12,windowMs:60000});
 const p=schema.safeParse(await req.json().catch(()=>null));if(!p.success)throw new ApiError('Demande invalide.',400);
 const v=p.data,c=paymentConfig();
 if(v.action==='checkout'){
  if(!c.enabled||req.nextUrl.origin!==c.origin||(c.mode==='sandbox'&&process.env.VERCEL_ENV==='production')||!process.env.LIVE_TOKEN_BROKER_URL||!process.env.LIVE_TOKEN_BROKER_SECRET||!process.env.LIVE_EMBED_HOSTS)throw new ApiError('Le paiement du direct n’est pas encore activé.',503,'UNAVAILABLE');
  const {order,fresh}=await newsroom<{order:PaymentOrder;fresh:boolean}>(a,'payments.reserve',{data:{plan:v.plan,wallet:c.wallet,mode:c.mode,amount:v.amount,durationMinutes:v.durationMinutes}});
  if(!fresh){
   if(order.plan_slug===v.plan&&order.state==='pending'&&order.checkout_url&&(!order.checkout_expires_at||Date.parse(order.checkout_expires_at)>Date.now()))return ok({...publicOrder(order),url:checkoutUrl(order.checkout_url)});
   return ok({...publicOrder(order),url:null,message:'Une transaction est déjà en cours. Vérifiez son état avant un nouvel achat.'});
  }
  try{
   const link=await createCheckout(order);
   await newsroom(system,'payments.link',{data:{reference:order.reference,url:link.url,expiresAt:link.expiresAt}});
   return ok({...publicOrder(order),state:'pending',url:link.url});
  }catch{
   await newsroom(system,'payments.review',{data:{reference:order.reference}}).catch(()=>{});
   return ok({...publicOrder(order),state:'review',url:null,message:'Lien non confirmé. Vérifiez cette référence avant un nouvel achat.'});
  }
 }
 const {order}=await newsroom<{order:PaymentOrder}>(a,'payments.get',{data:{reference:v.reference}});
 if(order.state==='paid')return ok(publicOrder(order));
 const result=await verifyOrder(order);
 if(result.state==='pending')return ok(publicOrder(order));
 if(result.state==='review'){await newsroom(system,'payments.review',{data:{reference:order.reference}});return ok({...publicOrder(order),state:'review'});}
 const updated=await newsroom<{order:PaymentOrder}>(system,'payments.settle',{data:{reference:order.reference,wallet:order.wallet_id,amount:Number(order.amount),state:result.state,providerId:result.providerId}});
 return ok(publicOrder(updated.order));
});
