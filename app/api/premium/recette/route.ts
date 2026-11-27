import {NextRequest} from 'next/server';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {ApiError,handleRoute,ok} from '../../../../lib/api/response';
import {recipeActor,readRecipe,encodeRecipe,recipeCookie} from '../../../../lib/payments/recipe-server';
import {premiumCatalog} from '../../../../lib/payments/catalog';
import {paymentConfig} from '../../../../lib/payments/singpay';
import {rateLimit} from '../../../../lib/api/rate-limit';
import {createRecipeOrder,submitRecipeOrder,verifyRecipeOrder,hasRecipeAccess,type RecipeOrder} from '../../../../lib/payments/recipe-state';
export const dynamic='force-dynamic';
async function owner(){const id=await recipeActor();if(!id)throw new ApiError('Recette indisponible.',404,'NOT_FOUND');return id;}
async function context(){const catalog=await premiumCatalog();const config=paymentConfig(catalog.settings);return {plans:catalog.plans.map(p=>({slug:p.slug,name:p.name,amount:p.amount,minutes:p.duration_minutes})),configuration:{configured:config.configured,mode:config.mode,returnConfigured:!!config.origin,checkoutHostsConfigured:config.allowedHosts.length>0}};}
function output(order:RecipeOrder|null,c:Awaited<ReturnType<typeof context>>){return {...c,order,access:hasRecipeAccess(order,Date.now()),now:Date.now(),simulation:true};}
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('start'),plan:z.string(),confirmed:z.literal(true)}),
 z.object({action:z.literal('submit'),reference:z.string().uuid(),method:z.enum(['airtel','moov']),outcome:z.enum(['success','insufficient','incorrect','pending','cancelled'])}),
 z.object({action:z.literal('verify'),reference:z.string().uuid()}),
 z.object({action:z.literal('reset')})
]);
export const GET=handleRoute(async()=>{const id=await owner();return ok(output(await readRecipe(id),await context()));});
export const POST=handleRoute(async(req:NextRequest)=>{
 const id=await owner();if(req.headers.get('origin')!==req.nextUrl.origin)throw new ApiError('Origine refusée.',403,'UNAUTHORIZED');
 rateLimit(req,{prefix:'premium-recipe',limit:30,windowMs:60000});
 const c=await context();
 const p=schema.safeParse(await req.json().catch(()=>null));if(!p.success)throw new ApiError('Demande invalide.',400);
 const v=p.data;let order=await readRecipe(id);const now=Date.now();
 if(v.action==='reset'){const res=ok(output(null,c));res.cookies.set(recipeCookie,'',{httpOnly:true,sameSite:'strict',secure:req.nextUrl.protocol==='https:',path:'/api/premium/recette',maxAge:0});return res;}
 try{
  if(v.action==='start'){
   // Une seule référence active par navigateur, même si le bouton est pressé plusieurs fois.
   if(!order||!['checkout','pending'].includes(order.state))order=createRecipeOrder(v.plan,randomUUID(),now,c.plans);
  }else{
   if(!order||order.reference!==v.reference)throw new ApiError('Référence de recette introuvable.',404,'NOT_FOUND');
   if(v.action==='submit')order=submitRecipeOrder(order,v.method,v.outcome,now);
   else order=verifyRecipeOrder(order,now);
  }
 }catch(e){if(e instanceof ApiError)throw e;throw new ApiError(e instanceof Error?e.message:'Transition refusée.',409,'CONFLICT');}
 const res=ok(output(order,c));if(order)res.cookies.set(recipeCookie,encodeRecipe(id,order),{httpOnly:true,sameSite:'strict',secure:req.nextUrl.protocol==='https:',path:'/api/premium/recette',maxAge:86400});return res;
});
