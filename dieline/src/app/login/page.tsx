import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata = { title: "Sign in · Dielines · Djarri Design Studio" };

export default function LoginPage() {
  return (
    <AuthShell title="Sign in" lead="Your cartons, versions and exports are waiting.">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
