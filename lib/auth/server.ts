import 'server-only';
import {cache} from 'react';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {type Permission} from './permissions';
export type AuthUser={id:string;email?:string;created_at?:string;user_metadata?:Record<string,unknown>};
export type AuthProfile={id:string;email:string;full_name:string|null;role:string;created_at:string;is_active?:boolean;permissions?:string[]};
export async function createAuthClient(){
 const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)throw new Error('Configuration Supabase manquante.');
 const store=await cookies();
 return createServerClient(url,key,{cookies:{getAll:()=>store.getAll(),setAll(items){try{items.forEach(({name,value,options})=>store.set(name,value,options));}catch{/* Le middleware renouvelle les cookies pour les Server Components. */}}}});
}
const identity=cache(async()=>{
 const db=await createAuthClient();
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user?.email_confirmed_at)return null;
 const {data:p,error:pe}=await db.from('profiles').select('id,full_name,role,is_active,created_at').eq('id',user.id).maybeSingle();
 if(pe||!p||p.is_active!==true)return null;
 const {data:r,error:re}=await db.from('roles').select('permissions').eq('key',p.role).maybeSingle();
 if(re||!r||!Array.isArray(r.permissions))return null;
 const profile:AuthProfile={...p,email:user.email??'',permissions:r.permissions.filter((x:unknown):x is string=>typeof x==='string')};
 return {user,profile};
});
export async function getUser():Promise<AuthUser|null>{return (await identity())?.user??null;}
export async function getProfile(existingUser?:AuthUser|null):Promise<AuthProfile|null>{const i=await identity();if(!i||existingUser===null||(existingUser&&existingUser.id!==i.user.id))return null;return i.profile;}
export async function requireUser(){const user=await getUser();if(!user)redirect('/connexion');return user;}
export async function requireAdmin(){const user=await requireUser(),profile=await getProfile(user);if(!profile||!['admin','super_admin'].includes(profile.role))redirect('/acces-refuse');return {user,profile};}
export async function hasPermission(permission:Permission){const p=await getProfile();return !!p?.permissions?.includes(permission);}
export async function requirePermission(permission:Permission){const {user,profile}=await requireAdmin();if(!profile.permissions?.includes(permission))redirect('/acces-refuse');return {user,profile};}
