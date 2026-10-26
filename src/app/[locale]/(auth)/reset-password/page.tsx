import { Suspense } from "react";

import { ResetPasswordForm, PasswordResetSkeleton } from "@/components/auth/password-reset-forms";

// Le jeton vient de l'URL (?token=) : jamais de rendu statique.
export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<PasswordResetSkeleton />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
