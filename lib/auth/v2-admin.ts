import 'server-only';
import {cache} from 'react';
import {redirect} from 'next/navigation';
import {ApiError} from '../api/response';
import {createAuthClient,getUser,getProfile} from './server';
export type V2Actor={id:string;email:string;name:string;role:string;permissions:string[]};
export const getV2Actor=cache(async():Promise<V2Actor|null>=>{
 const user=await getUser();if(!user)return null;
 const p=await getProfile(user);if(!p||!p.permissions)return null;
 return {id:user.id,email:p.email,name:p.full_name??p.email,role:p.role,permissions:p.permissions};
});
export function hasV2Permission(actor:V2Actor,permission:string){return actor.permissions.includes(permission);}
export async function requireV2Page(permission='articles.read_all'){const actor=await getV2Actor();if(!actor)redirect('/connexion?next=/admin-v2');if(!hasV2Permission(actor,permission))redirect('/acces-refuse');return actor;}
export async function requireV2Api(permission:string){return requireV2AnyApi([permission]);}
export async function requireV2AnyApi(permissions:string[]){const actor=await getV2Actor();if(!actor)throw new ApiError('Authentification requise.',401,'UNAUTHORIZED');if(!permissions.some(p=>hasV2Permission(actor,p)))throw new ApiError('Permission insuffisante.',403,'UNAUTHORIZED');return {actor,db:await createAuthClient()};}
