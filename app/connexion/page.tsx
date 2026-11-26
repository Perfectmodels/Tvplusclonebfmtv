import AuthForm from '../../components/auth/AuthForm';
import AuthShell from '../../components/auth/AuthShell';
import { safeReturnPath } from '../../lib/auth/return-path';

export const metadata = { title: 'Connexion — TV Plus' };

export default async function ConnexionPage({ searchParams }: { searchParams: Promise<{ next?: string; confirmation?: string }> }) {
  const query = await searchParams;
  const returnTo = safeReturnPath(query.next, '');
  return (
    <AuthShell
      title="Connexion"
      subtitle="Accédez à votre espace personnel TV Plus."
    >
      <AuthForm mode="login" returnTo={returnTo} confirmationFailed={query.confirmation === 'failed'} />
    </AuthShell>
  );
}
