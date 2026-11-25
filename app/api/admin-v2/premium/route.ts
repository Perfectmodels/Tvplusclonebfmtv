import {NextRequest} from 'next/server';
import {z} from 'zod';
import {getV2Actor} from '../../../../lib/auth/v2-admin';
import {newsroom} from '../../../../lib/admin-v2/lws';
import {ApiError,handleRoute,ok} from '../../../../lib/api/response';
import {paymentConfig} from '../../../../lib/payments/singpay';
export const dynamic='force-dynamic';
async function actor(){const a=await getV2Actor();if(!a)throw new ApiError('Connexion requise.',401,'UNAUTHORIZED');if(!a.permissions.includes('settings.manage'))throw new ApiError('Permission insuffisante.',403,'UNAUTHORIZED');return a;}
const plan=z.object({slug:z.string().regex(/^[a-z0-9-]{1,50}$/),name:z.string().trim().min(2).max(100),amount:z.number().int().min(1).max(1000000),duration_minutes:z.number().int().min(1).max(525600),active:z.boolean()});
export const GET=handleRoute(async()=>{const a=await actor();const c=paymentConfig();const r=await newsroom<Record<string,unknown>>(a,'payments.admin');return ok({...r,configured:c.configured,enabled:c.enabled,mode:c.mode});});
export const POST=handleRoute(async(req:NextRequest)=>{const a=await actor();if(req.headers.get('origin')!==req.nextUrl.origin)throw new ApiError('Origine refusée.',403,'UNAUTHORIZED');const p=plan.safeParse(await req.json().catch(()=>null));if(!p.success)throw new ApiError('Offre invalide.',400);return ok(await newsroom(a,'payments.plan_save',{data:p.data}));});
