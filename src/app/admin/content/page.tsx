import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { homeSections } from "@/db/schema";
import { moveSectionAction, toggleSectionAction } from "@/app/admin/_actions/content";
import { abtn, Badge, Card, Flash, PageHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/server/auth";
import { SECTION_LABEL } from "@/components/admin/section-labels";

export const metadata: Metadata = { title: "Homepage & content" };


export default async function ContentPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff("/admin/content");
  const flash = await searchParams;
  const db = await getDb();
  const rows = await db.select().from(homeSections).orderBy(asc(homeSections.position));
  return (
    <>
      <PageHeader
        title="Homepage"
        description="Reorder, show or hide and edit homepage sections. Changes are live immediately."
        actions={
          <>
            <Link href="/admin/content/pages" className={abtn("secondary")}>Pages</Link>
            <Link href="/admin/content/announcement" className={abtn("secondary")}>Announcement bar</Link>
            <a href="/" target="_blank" className={abtn("ghost")}>View homepage</a>
          </>
        }
      />
      <Flash ok={flash.ok} error={flash.error} />
      <Card>
        <ol className="divide-y divide-line">
          {rows.map((s, i) => (
            <li key={s.id} className={`flex flex-wrap items-center gap-3 py-3 ${s.visible ? "" : "opacity-55"}`}>
              <span className="w-6 text-right text-xs tabular-nums text-stone">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{SECTION_LABEL[s.type] ?? s.type}</p>
                <p className="truncate text-xs text-ash">{typeof s.data.heading === "string" ? s.data.heading : ""}</p>
              </div>
              {s.visible ? <Badge color="green">Shown</Badge> : <Badge>Hidden</Badge>}
              <div className="flex gap-1">
                <form action={moveSectionAction}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="dir" value="up" /><button type="submit" className={abtn("ghost", "sm")} disabled={i === 0} aria-label="Move up">↑</button></form>
                <form action={moveSectionAction}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="dir" value="down" /><button type="submit" className={abtn("ghost", "sm")} disabled={i === rows.length - 1} aria-label="Move down">↓</button></form>
                <form action={toggleSectionAction}><input type="hidden" name="id" value={s.id} /><button type="submit" className={abtn("secondary", "sm")}>{s.visible ? "Hide" : "Show"}</button></form>
                <Link href={`/admin/content/sections/${s.id}`} className={abtn("primary", "sm")}>Edit</Link>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </>
  );
}
