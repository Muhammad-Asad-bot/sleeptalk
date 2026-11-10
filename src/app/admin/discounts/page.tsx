import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { discounts } from "@/db/schema";
import { toggleDiscountAction } from "@/app/admin/_actions/sales";
import { abtn, Badge, EmptyRow, Flash, PageHeader, Table, tdClass, thClass } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { formatMoney, type MarketCode } from "@/lib/markets";
import { requireStaff } from "@/lib/server/auth";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Discounts" };

export default async function DiscountsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff("/admin/discounts");
  const flash = await searchParams;
  const db = await getDb();
  const rows = await db.select().from(discounts).orderBy(desc(discounts.createdAt));
  const now = new Date();
  return (
    <>
      <PageHeader title="Discounts" description="Promo codes customers enter in the bag or at checkout. Usage is counted when an order is paid." actions={<Link href="/admin/discounts/new" className={abtn("primary")}>New code</Link>} />
      <Flash ok={flash.ok} error={flash.error} />
      <Table>
        <thead>
          <tr><th className={thClass}>Code</th><th className={thClass}>Value</th><th className={thClass}>Applies to</th><th className={thClass}>Usage</th><th className={thClass}>Dates</th><th className={thClass}>Status</th><th className={thClass} /></tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((d) => {
            const expired = d.endsAt && d.endsAt < now;
            const scheduled = d.startsAt && d.startsAt > now;
            return (
              <tr key={d.id} className="hover:bg-paper">
                <td className={tdClass}><Link href={`/admin/discounts/${d.id}`} className="font-mono font-semibold hover:underline">{d.code}</Link><span className="block text-xs text-stone">{d.description}</span></td>
                <td className={tdClass}>
                  {d.type === "percentage" ? `${d.percentOff}% off` : Object.entries(d.amountOff).map(([m, v]) => formatMoney(v!, m as MarketCode)).join(" / ") + " off"}
                </td>
                <td className={`${tdClass} text-xs`}>{d.scope === "all" ? "Everything" : `${d.targetIds.length} ${d.scope}`}{d.markets.length ? ` · ${d.markets.join(", ")} only` : ""}</td>
                <td className={`${tdClass} tabular-nums`}>{d.usageCount}{d.usageLimit ? ` / ${d.usageLimit}` : ""}</td>
                <td className={`${tdClass} text-xs text-ash`}>{d.startsAt ? formatDate(d.startsAt) : "Now"} → {d.endsAt ? formatDate(d.endsAt) : "No end"}</td>
                <td className={tdClass}>{!d.active ? <Badge>Inactive</Badge> : expired ? <Badge color="red">Expired</Badge> : scheduled ? <Badge color="amber">Scheduled</Badge> : <Badge color="green">Active</Badge>}{d.isDemo ? <span className="ml-1"><Badge color="amber">Demo</Badge></span> : null}</td>
                <td className={tdClass}>
                  <form action={toggleDiscountAction}><input type="hidden" name="id" value={d.id} /><SubmitButton className={abtn("ghost", "sm")}>{d.active ? "Deactivate" : "Activate"}</SubmitButton></form>
                </td>
              </tr>
            );
          }) : <EmptyRow colSpan={7}>No discount codes yet.</EmptyRow>}
        </tbody>
      </Table>
    </>
  );
}
