import {premiumCatalog} from '../../../../lib/payments/catalog';
import type {NextRequest} from 'next/server';
import {checkoutAvailable,paymentConfig} from '../../../../lib/payments/singpay';
import {handleRoute,ok} from '../../../../lib/api/response';
export const dynamic='force-dynamic';
export const GET=handleRoute(async(req:NextRequest)=>{
 try{const {plans,settings}=await premiumCatalog();const c=paymentConfig(settings);
 return ok({available:true,enabled:checkoutAvailable(c,req.nextUrl.origin),mode:c.mode,plans});}
 catch{return ok({available:false,enabled:false,mode:paymentConfig().mode,plans:[],message:'Les formules sont momentanément indisponibles.'});}
});
