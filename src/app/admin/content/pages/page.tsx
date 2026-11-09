import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { pages } from "@/db/schema";
import { Badge, PageHeader, Table, tdClass, thClass } from "@/components/admin/ui";
import { requireStaff } from "@/lib/server/auth";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Pages" };

export default async function PagesAdminPage() {
  await requireStaff("/admin/content/pages");
  const db = await getDb();
  const rows = await db.select().from(pages).orderBy(asc(pages.slug));
  return (
    <>
      <PageHeader back={{ href: "/admin/content", label: "Homepage" }} title="Pages" description="About, FAQ, size guide, shipping, returns and legal pages. Legal wording must be approved by the client/legal counsel." />
      <Table>
        <thead><tr><th className={thClass}>Page</th><th className={thClass}>URL</th><th className={thClass}>Status</th><th className={thClass}>Updated</th></tr></thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.slug} className="hover:bg-paper">
              <td className={tdClass}><Link href={`/admin/content/pages/${p.slug}`} className="font-medium hover:underline">{p.title}</Link></td>
              <td className={`${tdClass} text-xs text-ash`}>/{p.slug}</td>
              <td className={tdClass}>{p.isPlaceholder ? <Badge color="amber">Placeholder copy</Badge> : <Badge color="green">Final</Badge>}</td>
              <td className={`${tdClass} text-xs text-ash`}>{formatDateTime(p.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
