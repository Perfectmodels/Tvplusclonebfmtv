import 'server-only';
import {z} from 'zod';
import {ApiError} from '../api/response';
import {livePayments} from './db';
export const settingsSchema=z.object({checkout_enabled:z.boolean(),golive_confirmed:z.boolean(),checkout_hosts:z.string().max(1500),return_origin:z.string().max(300)});
export type PremiumSettings=z.infer<typeof settingsSchema>;
export const emptySettings:PremiumSettings={checkout_enabled:false,golive_confirmed:false,checkout_hosts:'',return_origin:''};
const plan=z.object({slug:z.string(),name:z.string(),amount:z.coerce.number().int().positive(),duration_minutes:z.coerce.number().int().positive()});
const catalog=z.object({plans:z.array(plan),settings:settingsSchema});
export async function premiumCatalog(){try{return catalog.parse(await livePayments({id:'public',permissions:[]},'payments.plans'));}catch{throw new ApiError('Catalogue du direct indisponible.',503,'UNAVAILABLE');}}
