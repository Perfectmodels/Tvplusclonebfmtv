import AuthForm from '../../components/auth/AuthForm';
import AuthShell from '../../components/auth/AuthShell';
import { safeReturnPath } from '../../lib/auth/return-path';

export const metadata = { title: 'Inscription — TV Plus' };

export default async function InscriptionPage({ searchParams }: { searchParams: Promise<{ next?: string; confirmation?: string }> }) {
  const query = await searchParams;
  const returnTo = safeReturnPath(query.next, '');
  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Quelques informations suffisent pour commencer."
    >
      <AuthForm mode="signup" returnTo={returnTo} confirmationFailed={query.confirmation === 'failed'} />
    </AuthShell>
  );
}
