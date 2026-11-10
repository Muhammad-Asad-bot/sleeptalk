import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { getDb } from "@/db/client";
import { products, reviews } from "@/db/schema";
import { moderateReviewAction } from "@/app/admin/_actions/sales";
import { abtn, adminSelect, AField, Badge, FilterBar, Flash, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { requireStaff } from "@/lib/server/auth";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Reviews" };

const STATUS_COLOR = { pending: "amber", approved: "green", rejected: "red", hidden: "grey" } as const;

export default async function ReviewsAdminPage({ searchParams }: { searchParams: Promise<{ status?: string; reported?: string; ok?: string; error?: string }> }) {
  await requireStaff("/admin/reviews");
  const sp = await searchParams;
  const db = await getDb();
  const where: SQL[] = [];
  const status = sp.status ?? "pending";
  if (status !== "all" && status in STATUS_COLOR) where.push(eq(reviews.status, status as "pending"));
  if (sp.reported === "1") where.push(eq(reviews.reported, true));
  const rows = await db
    .select({ r: reviews, title: products.title, productId: products.id, slug: products.slug })
    .from(reviews)
    .innerJoin(products, eq(products.id, reviews.productId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(reviews.createdAt))
    .limit(100);
  const ret = `/admin/reviews?status=${status}${sp.reported === "1" ? "&reported=1" : ""}`;
  return (
    <>
      <PageHeader title="Reviews" description="Customer reviews appear on product pages only after approval. “Verified purchase” is set automatically from paid orders." />
      <Flash ok={sp.ok} error={sp.error} />
      <FilterBar clearHref={(sp.status && sp.status !== "pending") || sp.reported ? "/admin/reviews" : undefined}>
        <AField label="Status">
          <select name="status" defaultValue={status} className={adminSelect}>
            <option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="hidden">Hidden</option><option value="all">All</option>
          </select>
        </AField>
        <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="reported" value="1" defaultChecked={sp.reported === "1"} className="size-4 accent-ink" /> Reported only</label>
      </FilterBar>
      {rows.length ? (
        <ul className="space-y-3">
          {rows.map(({ r, title, productId }) => (
            <li key={r.id} className="border border-line bg-white/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-2">
                  <Badge color={STATUS_COLOR[r.status]}>{r.status}</Badge>
                  {r.verifiedPurchase ? <Badge color="green">Verified purchase</Badge> : null}
                  {r.reported ? <Badge color="red">Reported</Badge> : null}
                  <span className="font-semibold">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                </span>
                <span className="text-ash">{r.authorName} · {formatDateTime(r.createdAt)} · <Link href={`/admin/products/${productId}`} className="underline">{title}</Link></span>
              </div>
              {r.title ? <p className="mt-2 text-sm font-semibold">{r.title}</p> : null}
              <p className="mt-1 whitespace-pre-line text-sm text-charcoal">{r.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["approved", "rejected", "hidden"] as const).filter((s) => s !== r.status).map((s) => (
                  <form key={s} action={moderateReviewAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="status" value={s} />
                    <input type="hidden" name="_return" value={ret} />
                    <SubmitButton
                      className={abtn(s === "approved" ? "primary" : s === "rejected" ? "danger" : "secondary", "sm")}
                      confirm={s === "rejected" ? "Reject this review? It will not be shown on the store." : undefined}
                    >
                      {s === "approved" ? "Approve" : s === "rejected" ? "Reject" : "Hide"}
                    </SubmitButton>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border border-line bg-white/70 px-4 py-12 text-center text-sm text-ash">No reviews in this view.</p>
      )}
    </>
  );
}
