import AuthShell from '../../components/auth/AuthShell';
import ResetPasswordForm from '../../components/auth/ResetPasswordForm';
import {createAuthClient} from '../../lib/auth/server';
import {hasRecoveryProof} from '../../lib/auth/recovery';
import {safeReturnPath} from '../../lib/auth/return-path';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export const metadata={title:'Nouveau mot de passe — TV+ Afrique',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<{next?:string}>}){const next=safeReturnPath((await searchParams).next,'');const db=await createAuthClient();const {data:{user}}=await db.auth.getUser();if(!user?.email_confirmed_at||!await hasRecoveryProof(user.id))redirect('/mot-de-passe-oublie?confirmation=failed'+(next?'&next='+encodeURIComponent(next):''));return <AuthShell title="Nouveau mot de passe" subtitle="Choisissez un nouveau mot de passe sécurisé."><ResetPasswordForm returnTo={next}/></AuthShell>;}
