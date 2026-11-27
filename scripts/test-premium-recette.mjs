import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRecipeOrder,submitRecipeOrder,verifyRecipeOrder,currentRecipeOrder,hasRecipeAccess} from '../lib/payments/recipe-state.ts';
const now=1700000000000;
const order=()=>createRecipeOrder('test-day','recette',now);
test('prix décidé côté serveur et absence de droit avant confirmation',()=>{const o=order();assert.equal(o.amount,500);assert.equal(hasRecipeAccess(o,now),false);assert.throws(()=>createRecipeOrder('invalid','x',now));});
test('paiement accepté, confirmation idempotente et expiration',()=>{const p=submitRecipeOrder(order(),'airtel','success',now+1);assert.equal(hasRecipeAccess(p,now+1),false);const paid=verifyRecipeOrder(p,now+2);assert.equal(paid.state,'paid');assert.ok(hasRecipeAccess(paid,now+2));assert.equal(verifyRecipeOrder(paid,now+100).accessUntil,paid.accessUntil);assert.equal(hasRecipeAccess(paid,paid.accessUntil),false);assert.throws(()=>submitRecipeOrder(paid,'moov','success',now+3));});
for(const scenario of ['insufficient','incorrect','pending','cancelled'])test('pas de droit : '+scenario,()=>{const p=submitRecipeOrder(order(),'moov',scenario,now+1),r=verifyRecipeOrder(p,now+2);assert.equal(r.state,scenario==='pending'?'pending':scenario==='cancelled'?'cancelled':'failed');assert.equal(hasRecipeAccess(r,now+3),false);});
test('lien expiré : pas de paiement',()=>{const o=order();assert.equal(currentRecipeOrder(o,o.expiresAt).state,'expired');assert.throws(()=>submitRecipeOrder(o,'airtel','success',o.expiresAt));});

test('catalogue réel injecté par le serveur, aucune formule fictive acceptée',()=>{const plans=[{slug:'direct-24h',name:'Accès direct 24 h',amount:500,minutes:1440}];const o=createRecipeOrder('direct-24h','recette-reelle',now,plans);assert.equal(o.amount,500);assert.equal(o.minutes,1440);assert.throws(()=>createRecipeOrder('test-year','invalid',now,plans));assert.equal(hasRecipeAccess(o,now),false);});
