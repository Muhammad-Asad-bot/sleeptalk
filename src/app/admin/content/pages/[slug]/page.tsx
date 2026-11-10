import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { pages } from "@/db/schema";
import { savePageAction } from "@/app/admin/_actions/content";
import { abtn, adminInput, adminTextarea, AField, Card, Flash, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { requireStaff } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Edit page" };

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export default async function EditPagePage({ params, searchParams }: Props) {
  const [{ slug }, flash] = await Promise.all([params, searchParams]);
  await requireStaff("/admin/content/pages");
  const db = await getDb();
  const [p] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1);
  if (!p) notFound();
  return (
    <>
      <PageHeader back={{ href: "/admin/content/pages", label: "Pages" }} title={p.title} description={`/${p.slug}`} actions={<a href={`/${p.slug}`} target="_blank" className={abtn("ghost")}>View page</a>} />
      <Flash ok={flash.ok} error={flash.error} />
      <form action={savePageAction} className="grid gap-6 xl:grid-cols-3">
        <input type="hidden" name="slug" value={p.slug} />
        <div className="xl:col-span-2">
          <Card>
            <div className="space-y-4">
              <AField label="Title"><input name="title" required defaultValue={p.title} className={adminInput} /></AField>
              <AField label="Content" hint="Formatting: ## Heading · - list item · > callout · **bold** · [link text](/page) · | table | rows |. On the FAQ page each ## heading becomes a question.">
                <textarea name="body" defaultValue={p.body} className={`${adminTextarea} min-h-[480px] font-mono text-xs leading-relaxed`} />
              </AField>
            </div>
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Search engine listing">
            <div className="space-y-3">
              <AField label="SEO title"><input name="seoTitle" defaultValue={p.seoTitle} className={adminInput} /></AField>
              <AField label="Meta description"><textarea name="seoDescription" defaultValue={p.seoDescription} className={adminTextarea} /></AField>
            </div>
          </Card>
          <Card title="Status">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPlaceholder" defaultChecked={p.isPlaceholder} className="size-4 accent-ink" /> Still placeholder copy</label>
          </Card>
          <SubmitButton className={`${abtn("primary")} w-full`}>Save page</SubmitButton>
        </div>
      </form>
    </>
  );
}
