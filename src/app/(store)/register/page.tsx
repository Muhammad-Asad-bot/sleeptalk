import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/account/auth-shell";
import { RegisterForm } from "@/components/account/auth-forms";
import { getCurrentUser, safeNextPath } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function RegisterPage({ searchParams }: Props) {
  const { next } = await searchParams;
  if (await getCurrentUser()) redirect(safeNextPath(next, "/account"));
  return (
    <AuthShell title="Create account" subtitle="Faster checkout, order tracking and a wishlist that follows you everywhere.">
      <RegisterForm next={safeNextPath(next, "/account")} />
      <p className="mt-8 border-t border-line pt-6 text-sm text-ash">
        Already have an account?{" "}
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-ink underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
