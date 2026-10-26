import { Suspense } from "react";

import { LoginForm, LoginFormSkeleton } from "@/components/auth/login-form";

// Dépend de la session et de callbackUrl : jamais de rendu statique.
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
