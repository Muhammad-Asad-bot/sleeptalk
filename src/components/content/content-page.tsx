import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/listing/listing-page";
import { Markdown } from "@/lib/markdown";
import { getPage } from "@/lib/server/settings";
import { formatDate } from "@/lib/utils";

/** Renders an admin-managed content page (Admin → Content → Pages). */
export async function ContentPage({ slug, aside }: { slug: string; aside?: React.ReactNode }) {
  const page = await getPage(slug);
  if (!page) notFound();
  return (
    <div className="container-site pt-6 md:pt-10">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: `/${slug}`, label: page.title }]} />
      <div className="mt-6 grid gap-12 lg:grid-cols-12">
        <header className="lg:col-span-4">
          <h1 className="display text-5xl md:text-6xl">{page.title}</h1>
          <p className="mt-4 text-xs text-stone">Last updated {formatDate(page.updatedAt)}</p>
        </header>
        <div className="max-w-2xl lg:col-span-7 lg:col-start-6">
          <Markdown source={page.body} />
          {aside}
        </div>
      </div>
    </div>
  );
}

export async function contentMetadata(slug: string) {
  const page = await getPage(slug);
  if (!page) return {};
  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || undefined,
    alternates: { canonical: `/${slug}` },
  };
}
