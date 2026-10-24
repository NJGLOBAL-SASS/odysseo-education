import { Verify2FAForm } from "@/components/auth/verify-2fa-form";

// Dépend du cookie de session "pending" posé par /api/auth/password-check : pas de prérendu statique.
export const dynamic = "force-dynamic";

export default function Verify2FAPage() {
  return <Verify2FAForm />;
}
