import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/account/auth-shell";
import { ResetPasswordForm } from "@/components/account/auth-forms";

export const metadata: Metadata = { title: "Set a new password", robots: { index: false } };

type Props = { searchParams: Promise<{ token?: string }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;
  return (
    <AuthShell title="New password" subtitle="Choose a new password for your account.">
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-sm text-ash">
          This link is missing its reset token. <Link href="/forgot-password" className="underline">Request a new link</Link>.
        </p>
      )}
    </AuthShell>
  );
}
