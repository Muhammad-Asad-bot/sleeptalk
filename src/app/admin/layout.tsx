import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { getAdminCounts } from "@/lib/server/admin-counts";
import { requireStaff } from "@/lib/server/auth";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · SLEEP TALK" },
  robots: { index: false, follow: false },
};

/** Protected admin area: staff and owners only (checked server-side on every request). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff("/admin");
  // "Needs attention" counters; the sidebar keeps them fresh from /api/admin/counts.
  const counts = await getAdminCounts();
  return (
    <div className="min-h-dvh bg-[#f1ede6]">
      <AdminNav
        role={user.role === "owner" ? "owner" : "staff"}
        email={user.email}
        counts={counts}
      />
      <main className="lg:pl-60">
        <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
