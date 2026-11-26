import AuthShell from '../../components/auth/AuthShell';
import ForgotForm from '../../components/auth/ForgotForm';

export default function MotDePasseOubliePage() {
  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle="Nous vous enverrons un lien pour le réinitialiser."
    >
      <ForgotForm />
      <p className="auth-switch"><a href="/connexion">Retour à la connexion</a></p>
    </AuthShell>
  );
}
