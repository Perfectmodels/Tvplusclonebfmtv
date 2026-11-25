import 'server-only';
import {cache} from 'react';
import {redirect} from 'next/navigation';
import {newsroom} from '../admin-v2/lws';
import {getSession} from './session';
import {ROLE_PERMISSIONS,type Permission} from './permissions';
export type AuthUser={id:string;email?:string;created_at?:string;user_metadata?:Record<string,unknown>};
export type AuthProfile={id:string;email:string;full_name:string|null;role:string;created_at:string;is_active?:boolean;permissions?:string[]};
type MysqlProfile={id:string;email:string;full_name:string|null;role:string;is_active:boolean;permissions:string[]};
const mysqlProfile=cache(async():Promise<MysqlProfile|null>=>{
 const session=await getSession();if(!session)return null;
 try{const p=await newsroom<MysqlProfile>({id:session.uid,permissions:[]},'auth.me',{data:{id:session.uid}});return p.is_active?p:null;}catch{return null;}
});
export async function getUser():Promise<AuthUser|null>{const p=await mysqlProfile();return p?{id:p.id,email:p.email,created_at:'',user_metadata:{full_name:p.full_name}}:null;}
export async function getProfile(existingUser?:AuthUser|null):Promise<AuthProfile|null>{const p=await mysqlProfile();if(!p||existingUser===null||(existingUser&&existingUser.id!==p.id))return null;return {...p,created_at:''};}
export async function requireUser(){const user=await getUser();if(!user)redirect('/connexion');return user;}
export async function requireAdmin(){const user=await requireUser(),profile=await getProfile(user);if(!profile||!['admin','super_admin'].includes(profile.role))redirect('/acces-refuse');return {user,profile};}
export async function hasPermission(permission:Permission){const p=await getProfile();return !!p&&(p.permissions??ROLE_PERMISSIONS[p.role]??[]).includes(permission);}
export async function requirePermission(permission:Permission){const {user,profile}=await requireAdmin();if(!(profile.permissions??ROLE_PERMISSIONS[profile.role]??[]).includes(permission))redirect('/acces-refuse');return {user,profile};}
// Les anciens modules non migrés échouent explicitement : aucune connexion à l’ancien fournisseur.
export async function createAuthClient():Promise<import('@supabase/supabase-js').SupabaseClient>{throw new Error('Ancien accès désactivé : migrer cette route vers le service éditorial MySQL.');}
