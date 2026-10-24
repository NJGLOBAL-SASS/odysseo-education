import { LoginForm } from "@/components/auth/login-form";

// Dépend de la session et de callbackUrl : jamais de rendu statique.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return <LoginForm />;
}
