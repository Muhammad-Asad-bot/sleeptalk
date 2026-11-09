import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/account/auth-shell";
import { ForgotPasswordForm } from "@/components/account/auth-forms";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset password" subtitle="Enter your email and we'll send you a link to set a new password.">
      <ForgotPasswordForm />
      <p className="mt-8 text-sm">
        <Link href="/login" className="underline underline-offset-4">Back to sign in</Link>
      </p>
    </AuthShell>
  );
}
