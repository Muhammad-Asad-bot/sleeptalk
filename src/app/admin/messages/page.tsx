import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { contactMessages } from "@/db/schema";
import { toggleMessageHandledAction } from "@/app/admin/_actions/sales";
import { abtn, Badge, Flash, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { requireStaff } from "@/lib/server/auth";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ show?: string; ok?: string; error?: string }> }) {
  await requireStaff("/admin/messages");
  const sp = await searchParams;
  const db = await getDb();
  const all = sp.show === "all";
  const rows = await db.select().from(contactMessages).where(all ? undefined : eq(contactMessages.handled, false)).orderBy(desc(contactMessages.createdAt)).limit(200);
  return (
    <>
      <PageHeader
        title="Messages"
        description="Messages sent through the Contact page. Reply by email, then mark them handled."
        actions={<a href={all ? "/admin/messages" : "/admin/messages?show=all"} className={abtn("secondary")}>{all ? "Show open only" : "Show all"}</a>}
      />
      <Flash ok={sp.ok} error={sp.error} />
      {rows.length ? (
        <ul className="space-y-3">
          {rows.map((m) => (
            <li key={m.id} className={`border border-line bg-white/70 p-4 ${m.handled ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-2 font-semibold">
                  {m.handled ? <Badge>Handled</Badge> : <Badge color="amber">Open</Badge>}
                  {m.subject || "No subject"}
                  {m.orderNumber ? <span className="font-normal text-ash">· Order {m.orderNumber}</span> : null}
                </span>
                <span className="text-ash">{formatDateTime(m.createdAt)}</span>
              </div>
              <p className="mt-2 text-sm"><strong>{m.name}</strong> · <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || "Your message to SLEEP TALK"}`)}`} className="underline">{m.email}</a></p>
              <p className="mt-2 whitespace-pre-line text-sm text-charcoal">{m.message}</p>
              <form action={toggleMessageHandledAction} className="mt-3">
                <input type="hidden" name="id" value={m.id} />
                <SubmitButton className={abtn(m.handled ? "secondary" : "primary", "sm")}>{m.handled ? "Reopen" : "Mark handled"}</SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border border-line bg-white/70 px-4 py-12 text-center text-sm text-ash">{all ? "No messages yet." : "No open messages."}</p>
      )}
    </>
  );
}
