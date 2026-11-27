import 'server-only';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {getV2Actor} from '../auth/v2-admin';
import {currentRecipeOrder,type RecipeOrder} from './recipe-state';
export const recipeCookie='tvplus_premium_recipe_v1';
export function simulationMode(){return process.env.PREMIUM_RECIPE_ENABLED==='true'&&process.env.PREMIUM_SIMULATION_ONLY==='true';}
function signingKey(){return process.env.PREMIUM_RECIPE_SECRET||process.env.AUTH_SESSION_SECRET||'';}
export function recipeEnabled(){
 const env=process.env.VERCEL_ENV;
 return process.env.PREMIUM_RECIPE_ENABLED==='true'&&signingKey().length>=32&&(env==='preview'||(env==='production'&&simulationMode())||(!env&&process.env.NODE_ENV==='development'));
}
export async function recipeActor(){
 if(!recipeEnabled())return null;
 // Recette réservée aux administrateurs, y compris en production si simulation explicitement activée.
 if(!process.env.VERCEL_ENV&&process.env.NODE_ENV==='development')return 'local-recipe';
 const actor=await getV2Actor();return actor?.permissions.includes('settings.manage')?actor.id:null;
}
type Payload={owner:string;until:number;order:RecipeOrder};
function sign(value:string){return createHmac('sha256',signingKey()).update('tvplus-recipe-v1:'+value).digest('base64url');}
export function encodeRecipe(owner:string,order:RecipeOrder){const value=Buffer.from(JSON.stringify({owner,until:Date.now()+24*60*60_000,order})).toString('base64url');return value+'.'+sign(value);}
export async function readRecipe(owner:string){
 const raw=(await cookies()).get(recipeCookie)?.value;if(!raw)return null;
 try{const [value,sig,extra]=raw.split('.');if(!value||!sig||extra)return null;const a=Buffer.from(sig),b=Buffer.from(sign(value));if(a.length!==b.length||!timingSafeEqual(a,b))return null;const p=JSON.parse(Buffer.from(value,'base64url').toString('utf8')) as Payload;if(p.owner!==owner||p.until<=Date.now())return null;return currentRecipeOrder(p.order,Date.now());}catch{return null;}
}
