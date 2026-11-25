import {premiumCatalog} from '../../../../lib/payments/catalog';
import {playbackConfig} from '../../../../lib/video/premium';
import {paymentConfig} from '../../../../lib/payments/singpay';
import {handleRoute,ok} from '../../../../lib/api/response';
export const dynamic='force-dynamic';
export const GET=handleRoute(async()=>{
 try{const {plans,settings}=await premiumCatalog();const c=paymentConfig(settings);
 return ok({available:true,enabled:c.enabled&&(c.mode==='sandbox'||playbackConfig().ready),mode:c.mode,plans});}
 catch{return ok({available:false,enabled:false,mode:paymentConfig().mode,plans:[],message:'Les offres ne sont pas encore accessibles depuis le serveur. Vous pouvez consulter le parcours, aucun débit ne sera effectué.'});}
});
