import AuthShell from '../../components/auth/AuthShell';
import ResetPasswordForm from '../../components/auth/ResetPasswordForm';
import {createAuthClient} from '../../lib/auth/server';
import {redirect} from 'next/navigation';
export const dynamic='force-dynamic';
export const metadata={title:'Nouveau mot de passe — TV+ Afrique',robots:{index:false,follow:false}};
export default async function Page(){const db=await createAuthClient();const {data:{user}}=await db.auth.getUser();if(!user?.email_confirmed_at)redirect('/mot-de-passe-oublie');return <AuthShell title="Nouveau mot de passe" subtitle="Choisissez un nouveau mot de passe sécurisé."><ResetPasswordForm/></AuthShell>;}
