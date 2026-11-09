import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { AccountShell } from "@/components/account/account-shell";
import { PasswordForm, ProfileForm } from "@/components/account/account-forms";
import { requireUser } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Account settings", robots: { index: false } };

export default async function SettingsPage() {
  const user = await requireUser("/account/settings");
  const db = await getDb();
  const [row] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  return (
    <AccountShell active="/account/settings" title="Settings" name={user.firstName || "there"}>
      <div className="grid gap-10 xl:grid-cols-2">
        <section>
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.12em]">Profile</h2>
          <p className="mb-5 text-sm text-ash">Email: {user.email}</p>
          <ProfileForm firstName={row.firstName} lastName={row.lastName} marketingOptIn={row.marketingOptIn} />
        </section>
        <section>
          <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.12em]">Password</h2>
          <PasswordForm />
        </section>
      </div>
    </AccountShell>
  );
}
