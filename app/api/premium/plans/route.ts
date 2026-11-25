import {newsroom} from '../../../../lib/admin-v2/lws';
import {playbackConfig} from '../../../../lib/video/premium';
import {paymentConfig} from '../../../../lib/payments/singpay';
import {handleRoute,ok} from '../../../../lib/api/response';
export const dynamic='force-dynamic';
export const GET=handleRoute(async()=>{
 const c=paymentConfig();
 const enabled=c.enabled&&(c.mode==='sandbox'||playbackConfig().ready)&&!(c.mode==='sandbox'&&process.env.VERCEL_ENV==='production');
 const {plans}=await newsroom<{plans:{slug:string;name:string;amount:number|string;duration_minutes:number|string}[]}>({id:'public',permissions:[]},'payments.plans');
 return ok({enabled,mode:c.mode,plans:plans.map(p=>({...p,amount:Number(p.amount),duration_minutes:Number(p.duration_minutes)}))});
});