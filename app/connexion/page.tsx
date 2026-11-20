import AuthForm from '../../components/auth/AuthForm';
import AuthShell from '../../components/auth/AuthShell';

export const metadata = { title: 'Connexion — TV Plus' };

export default function ConnexionPage() {
  return (
    <AuthShell
      title="Connexion"
      subtitle="Accédez à votre espace personnel TV Plus."
    >
      <AuthForm mode="login" />
    </AuthShell>
  );
}
