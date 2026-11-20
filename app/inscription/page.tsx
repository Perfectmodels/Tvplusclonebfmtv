import AuthForm from '../../components/auth/AuthForm';
import AuthShell from '../../components/auth/AuthShell';

export const metadata = { title: 'Inscription — TV Plus' };

export default function InscriptionPage() {
  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Quelques informations suffisent pour commencer."
    >
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
