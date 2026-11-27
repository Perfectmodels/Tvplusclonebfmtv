// Machine d'état de recette uniquement. Aucune API externe, aucun droit réel.
export const recipePlans=[
 {slug:'test-day',name:'Pass 24 heures — test',amount:500,minutes:1440},
 {slug:'test-week',name:'Pass 7 jours — test',amount:1500,minutes:10080},
 {slug:'test-month',name:'Pass 30 jours — test',amount:3000,minutes:43200},
 {slug:'test-year',name:'Pass 365 jours — test',amount:30000,minutes:525600}
] as const;
export type RecipeState='checkout'|'pending'|'paid'|'failed'|'cancelled'|'expired';
export type RecipeOutcome='success'|'insufficient'|'incorrect'|'pending'|'cancelled';
export type RecipeOrder={reference:string;plan:string;amount:number;minutes:number;state:RecipeState;createdAt:number;expiresAt:number;method?:'airtel'|'moov';outcome?:RecipeOutcome;accessUntil?:number};
export type RecipePlan={slug:string;name:string;amount:number;minutes:number};
export function createRecipeOrder(slug:string,reference:string,now:number,plans:readonly RecipePlan[]=recipePlans):RecipeOrder{
 const p=plans.find(p=>p.slug===slug);if(!p)throw new Error('Offre de recette inconnue.');
 return {reference,plan:p.slug,amount:p.amount,minutes:p.minutes,state:'checkout',createdAt:now,expiresAt:now+15*60_000};
}
export function currentRecipeOrder(order:RecipeOrder,now:number):RecipeOrder{
 if(['checkout','pending'].includes(order.state)&&now>=order.expiresAt)return {...order,state:'expired'};
 return order;
}
export function submitRecipeOrder(order:RecipeOrder,method:'airtel'|'moov',outcome:RecipeOutcome,now:number):RecipeOrder{
 const o=currentRecipeOrder(order,now);
 if(o.state!=='checkout')throw new Error('Cette référence a déjà été traitée.');
 if(outcome==='cancelled')return {...o,method,outcome,state:'cancelled'};
 return {...o,method,outcome,state:'pending'};
}
export function verifyRecipeOrder(order:RecipeOrder,now:number):RecipeOrder{
 const o=currentRecipeOrder(order,now);
 if(o.state!=='pending')return o;
 if(o.outcome==='success')return {...o,state:'paid',accessUntil:now+o.minutes*60_000};
 if(o.outcome==='insufficient'||o.outcome==='incorrect')return {...o,state:'failed'};
 return o;
}
export function hasRecipeAccess(order:RecipeOrder|null,now:number){return !!order&&order.state==='paid'&&typeof order.accessUntil==='number'&&order.accessUntil>now;}
