import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/account/auth-shell";
import { LoginForm } from "@/components/account/auth-forms";
import { getCurrentUser, safeNextPath } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  const target = safeNextPath(next, user && user.role !== "customer" ? "/admin" : "/account");
  if (user) redirect(target);
  return (
    <AuthShell title="Sign in" subtitle="Welcome back. Sign in to track orders, manage addresses and see your wishlist.">
      <LoginForm next={safeNextPath(next, "")} />
      <p className="mt-8 border-t border-line pt-6 text-sm text-ash">
        New to SLEEP TALK?{" "}
        <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-medium text-ink underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
