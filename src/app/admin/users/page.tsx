import type { Metadata } from "next";
import { asc, ne } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users } from "@/db/schema";
import { updateStaffAction } from "@/app/admin/_actions/settings";
import { abtn, Badge, Flash, inputSm, PageHeader, Table, tdClass, thClass } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { requireOwner } from "@/lib/server/auth";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Users & roles" };

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const me = await requireOwner();
  const flash = await searchParams;
  const db = await getDb();
  const rows = await db.select().from(users).where(ne(users.role, "customer")).orderBy(asc(users.email));
  return (
    <>
      <PageHeader title="Users & roles" description="Admin access is fixed: new admin accounts can't be created here. You can change the role of existing admin accounts or disable them." />
      <Flash ok={flash.ok} error={flash.error} />
      <Table>
        <thead><tr><th className={thClass}>Person</th><th className={thClass}>Last sign-in</th><th className={thClass}>Access</th></tr></thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id}>
              <td className={tdClass}>
                <span className="font-medium">{u.firstName} {u.lastName}</span> {u.id === me.id ? <Badge>You</Badge> : null}
                <span className="block text-xs text-stone">{u.email}</span>
              </td>
              <td className={`${tdClass} text-xs text-ash`}>{u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "Never"}</td>
              <td className={tdClass}>
                <form action={updateStaffAction} className="flex flex-wrap items-center gap-2 text-xs">
                  <input type="hidden" name="id" value={u.id} />
                  <select name="role" defaultValue={u.role} className={`${inputSm} w-28`} aria-label="Role">
                    <option value="owner">Owner</option>
                    <option value="staff">Staff</option>
                    <option value="customer">Remove access</option>
                  </select>
                  <label className="flex items-center gap-1"><input type="checkbox" name="disabled" defaultChecked={u.disabled} className="size-3.5 accent-ink" /> Disabled</label>
                  <SubmitButton className={abtn("secondary", "sm")}>Save</SubmitButton>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
