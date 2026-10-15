import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { AuthShell } from "@/components/AuthShell";

export const metadata = { title: "Create an account · Dielines · Djarri Design Studio" };

export default function SignupPage() {
  return (
    <AuthShell title="Create a free account" lead="Generate, save and version pharma carton dielines. Free, no card needed.">
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
