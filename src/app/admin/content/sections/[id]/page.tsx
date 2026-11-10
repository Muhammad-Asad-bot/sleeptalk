import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { collections, homeSections } from "@/db/schema";
import { saveSectionAction } from "@/app/admin/_actions/content";
import { UploadField } from "@/components/admin/upload-field";
import { abtn, adminInput, adminSelect, adminTextarea, AField, Card, Flash, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { requireStaff } from "@/lib/server/auth";
import { SECTION_LABEL } from "@/components/admin/section-labels";

export const metadata: Metadata = { title: "Edit section" };

const LONG = /^(body|subheading|description|note)$/;
const IMAGE = /^(image|image2|video)$/;
const human = (k: string) => k.replace(/([A-Z0-9])/g, " $1").replace(/^./, (c) => c.toUpperCase()).replace("Cta", "Button").replace("Href", "link");

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export default async function SectionEditPage({ params, searchParams }: Props) {
  const [{ id }, flash] = await Promise.all([params, searchParams]);
  await requireStaff("/admin/content");
  const db = await getDb();
  const [s] = await db.select().from(homeSections).where(eq(homeSections.id, id)).limit(1);
  if (!s) notFound();
  const cols = s.type === "featured_collection" ? await db.select({ slug: collections.slug, title: collections.title }).from(collections).orderBy(asc(collections.position)) : [];
  const data = { ...s.data };
  if (s.type === "hero" && !Array.isArray(data.ticker)) data.ticker = [];

  const fields = Object.entries(data).map(([key, value]) => {
    if (key === "collectionSlug") {
      return (
        <AField key={key} label="Collection">
          <input type="hidden" name={`t_${key}`} value="string" />
          <select name={`f_${key}`} defaultValue={String(value)} className={adminSelect}>
            {cols.map((c) => <option key={c.slug} value={c.slug}>{c.title}</option>)}
          </select>
        </AField>
      );
    }
    if (typeof value === "number") {
      return (
        <AField key={key} label={human(key)}>
          <input type="hidden" name={`t_${key}`} value="number" />
          <input name={`f_${key}`} type="number" min={1} max={48} defaultValue={value} className={adminInput} />
        </AField>
      );
    }
    if (typeof value === "boolean") {
      return (
        <label key={key} className="flex items-center gap-2 text-sm">
          <input type="hidden" name={`t_${key}`} value="bool" />
          <input type="checkbox" name={`f_${key}`} defaultChecked={value} className="size-4 accent-ink" /> {human(key)}
        </label>
      );
    }
    if (Array.isArray(value)) {
      const isImages = value.some((v) => v && typeof v === "object");
      return (
        <AField key={key} label={human(key)} hint={isImages ? "One image per line: /path/or/https-url | alt text | optional link" : "One item per line"} className="md:col-span-2">
          <input type="hidden" name={`t_${key}`} value={isImages ? "images" : "lines"} />
          <textarea
            name={`f_${key}`}
            defaultValue={isImages ? (value as { src: string; alt?: string; href?: string }[]).map((v) => [v.src, v.alt ?? "", v.href ?? ""].join(" | ").replace(/( \| )+$/, "")).join("\n") : (value as string[]).join("\n")}
            className={`${adminTextarea} min-h-32 font-mono text-xs`}
          />
        </AField>
      );
    }
    if (typeof value === "string") {
      if (IMAGE.test(key)) {
        return (
          <div key={key} className="md:col-span-2">
            <input type="hidden" name={`t_${key}`} value="string" />
            <UploadField name={`f_${key}`} defaultValue={value} label={human(key)} />
          </div>
        );
      }
      return (
        <AField key={key} label={human(key)} className={LONG.test(key) ? "md:col-span-2" : undefined}>
          <input type="hidden" name={`t_${key}`} value="string" />
          {LONG.test(key) ? <textarea name={`f_${key}`} defaultValue={value} className={adminTextarea} /> : <input name={`f_${key}`} defaultValue={value} className={adminInput} />}
        </AField>
      );
    }
    return null;
  });

  return (
    <>
      <PageHeader back={{ href: "/admin/content", label: "Homepage" }} title={SECTION_LABEL[s.type] ?? s.type} description="Links must start with / (pages on this site) or https://." />
      <Flash ok={flash.ok} error={flash.error} />
      <form action={saveSectionAction}>
        <input type="hidden" name="id" value={s.id} />
        <Card>
          <div className="grid gap-4 md:grid-cols-2">{fields}</div>
          <div className="mt-6 flex gap-3">
            <SubmitButton className={abtn("primary")}>Save section</SubmitButton>
            <a href="/" target="_blank" className={abtn("ghost")}>Preview homepage</a>
          </div>
        </Card>
      </form>
    </>
  );
}
