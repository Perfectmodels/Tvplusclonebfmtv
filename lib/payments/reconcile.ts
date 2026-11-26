import 'server-only';
import {livePayments as newsroom} from '../payments/db';
import {verifyOrder,type PaymentOrder} from './singpay';
const system={id:'payment-service',permissions:[]};
export async function reconcileOrder(order:PaymentOrder):Promise<PaymentOrder>{
 if(order.state==='paid')return order;
 let outcome:'pending'|'paid'|'failed'|'review'|'provider_error'='provider_error';
 try{
  const result=await verifyOrder(order);outcome=result.state;
  if(result.state==='pending')return order;
  if(result.state==='review'){
   await newsroom(system,'payments.review',{data:{reference:order.reference}});
   return {...order,state:'review'};
  }
  const updated=await newsroom<{order:PaymentOrder}>(system,'payments.settle',{data:{reference:order.reference,wallet:order.wallet_id,amount:Number(order.amount),state:result.state,providerId:result.providerId}});
  return updated.order;
 }catch(e){outcome='provider_error';throw e;}
 finally{await newsroom(system,'payments.record_check',{data:{reference:order.reference,result:outcome}}).catch(()=>{console.warn('Rapprochement : suivi de vérification indisponible.');});}
}
