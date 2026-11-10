import type { Metadata } from "next";
import { and, desc, ilike, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import { auditLogs } from "@/db/schema";
import { adminInput, AField, EmptyRow, FilterBar, PageHeader, Pagination, Table, tdClass, thClass } from "@/components/admin/ui";
import { requireStaff } from "@/lib/server/auth";
import { pageParam } from "@/lib/server/admin";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit log" };
const PER_PAGE = 50;

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireStaff("/admin/audit-log");
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const db = await getDb();
  const where: SQL[] = [];
  if (sp.q?.trim()) {
    const q = `%${sp.q.trim()}%`;
    where.push(or(ilike(auditLogs.action, q), ilike(auditLogs.userEmail, q), ilike(auditLogs.entityType, q), ilike(auditLogs.entityId, q))!);
  }
  const cond = where.length ? and(...where) : undefined;
  const [total, rows] = await Promise.all([
    db.$count(auditLogs, cond),
    db.select().from(auditLogs).where(cond).orderBy(desc(auditLogs.createdAt)).limit(PER_PAGE).offset((page - 1) * PER_PAGE),
  ]);
  return (
    <>
      <PageHeader title="Audit log" description="Every admin change to products, prices, stock, orders, discounts, content and settings." />
      <FilterBar clearHref={sp.q ? "/admin/audit-log" : undefined}>
        <AField label="Search" className="w-72"><input name="q" defaultValue={sp.q} placeholder="Action, person, e.g. inventory, order" className={adminInput} /></AField>
      </FilterBar>
      <Table>
        <thead><tr><th className={thClass}>When</th><th className={thClass}>Who</th><th className={thClass}>Action</th><th className={thClass}>Item</th><th className={thClass}>Details</th></tr></thead>
        <tbody>
          {rows.length ? rows.map((r) => (
            <tr key={r.id}>
              <td className={`${tdClass} whitespace-nowrap text-xs text-ash`}>{formatDateTime(r.createdAt)}</td>
              <td className={`${tdClass} text-xs`}>{r.userEmail}</td>
              <td className={`${tdClass} font-mono text-xs`}>{r.action}</td>
              <td className={`${tdClass} text-xs text-ash`}>{r.entityType}{r.entityId ? ` · ${r.entityId.slice(0, 24)}` : ""}</td>
              <td className={`${tdClass} max-w-[420px] truncate font-mono text-[0.6875rem] text-ash`} title={JSON.stringify(r.details)}>{JSON.stringify(r.details)}</td>
            </tr>
          )) : <EmptyRow colSpan={5}>No activity recorded yet.</EmptyRow>}
        </tbody>
      </Table>
      <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} params={{ q: sp.q }} />
    </>
  );
}
