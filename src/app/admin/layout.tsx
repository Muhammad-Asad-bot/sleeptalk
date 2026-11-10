import type { Metadata } from "next";
import { and, eq, lte, sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { contactMessages, orders, products, reviews, variants } from "@/db/schema";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireStaff } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · SLEEP TALK" },
  robots: { index: false, follow: false },
};

/** Protected admin area: staff and owners only (checked server-side on every request). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff("/admin");
  const db = await getDb();
  // "Needs attention" counters shown next to the matching menu items.
  const [toFulfil, openMessages, pendingReviews, lowStock] = await Promise.all([
    db.$count(orders, and(eq(orders.status, "paid"), eq(orders.fulfillmentStatus, "unfulfilled"))),
    db.$count(contactMessages, eq(contactMessages.handled, false)),
    db.$count(reviews, eq(reviews.status, "pending")),
    db
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(variants)
      .innerJoin(products, eq(products.id, variants.productId))
      .where(and(eq(variants.active, true), eq(variants.allowBackorder, false), lte(variants.stock, variants.lowStockThreshold), eq(products.status, "active")))
      .then((r) => r[0]?.n ?? 0),
  ]);
  return (
    <div className="min-h-dvh bg-[#f1ede6]">
      <AdminNav
        role={user.role === "owner" ? "owner" : "staff"}
        email={user.email}
        counts={{ "/admin/orders": toFulfil, "/admin/messages": openMessages, "/admin/reviews": pendingReviews, "/admin/inventory": lowStock }}
      />
      <main className="lg:pl-60">
        <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
