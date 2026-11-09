import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { collections } from "@/db/schema";
import { abtn, Badge, EmptyRow, Flash, PageHeader, Table, tdClass, thClass } from "@/components/admin/ui";
import { collectionIsLive, getCollectionsWithMembers } from "@/lib/server/catalog";
import { requireStaff } from "@/lib/server/auth";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Collections" };

export default async function CollectionsAdminPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff("/admin/collections");
  const flash = await searchParams;
  const db = await getDb();
  const [rows, members] = await Promise.all([db.select().from(collections).orderBy(asc(collections.position)), getCollectionsWithMembers("UK")]);
  return (
    <>
      <PageHeader title="Collections" description="Curated (manual) or automatic (rule-based) groups of products, e.g. drops and seasonal edits." actions={<Link href="/admin/collections/new" className={abtn("primary")}>New collection</Link>} />
      <Flash ok={flash.ok} error={flash.error} />
      <Table>
        <thead>
          <tr>
            <th className={thClass}>Collection</th><th className={thClass}>Type</th><th className={thClass}>Products</th><th className={thClass}>Status</th><th className={thClass}>Schedule</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((c) => (
            <tr key={c.id} className="hover:bg-paper">
              <td className={tdClass}><Link href={`/admin/collections/${c.id}`} className="font-medium hover:underline">{c.title}</Link><span className="block text-xs text-stone">/collections/{c.slug}</span></td>
              <td className={tdClass}><Badge>{c.mode === "rule" ? "Automatic" : "Manual"}</Badge></td>
              <td className={`${tdClass} tabular-nums`}>{members.find((m) => m.id === c.id)?.productIds.length ?? 0}</td>
              <td className={tdClass}>{collectionIsLive(c) ? <Badge color="green">Live</Badge> : <Badge color="amber">Not live</Badge>}</td>
              <td className={`${tdClass} text-xs text-ash`}>{c.publishAt ? `From ${formatDate(c.publishAt)}` : "—"}{c.unpublishAt ? ` · until ${formatDate(c.unpublishAt)}` : ""}</td>
            </tr>
          )) : <EmptyRow colSpan={5}>No collections yet.</EmptyRow>}
        </tbody>
      </Table>
    </>
  );
}
