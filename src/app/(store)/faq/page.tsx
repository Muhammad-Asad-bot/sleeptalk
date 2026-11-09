import { notFound } from "next/navigation";
import { contentMetadata } from "@/components/content/content-page";
import { Breadcrumbs } from "@/components/listing/listing-page";
import { blocksToMarkdown, Markdown, splitSections } from "@/lib/markdown";
import { getPage } from "@/lib/server/settings";

export const generateMetadata = () => contentMetadata("faq");

export default async function FaqPage() {
  const page = await getPage("faq");
  if (!page) notFound();
  const { intro, sections } = splitSections(page.body);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: sections.map((s) => ({
      "@type": "Question",
      name: s.title,
      acceptedAnswer: { "@type": "Answer", text: blocksToMarkdown(s.blocks) },
    })),
  };
  return (
    <div className="container-site pt-6 md:pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/faq", label: "FAQ" }]} />
      <div className="mt-6 grid gap-12 lg:grid-cols-12">
        <header className="lg:col-span-4">
          <h1 className="display text-5xl md:text-6xl">{page.title}</h1>
        </header>
        <div className="lg:col-span-7 lg:col-start-6">
          {intro.length ? <Markdown source={blocksToMarkdown(intro)} /> : null}
          <div className="mt-6 border-t border-line">
            {sections.map((s) => (
              <details key={s.title} className="group border-b border-line">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-base font-medium [&::-webkit-details-marker]:hidden">
                  {s.title}
                  <span className="text-xl font-normal transition-transform group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <div className="pb-6">
                  <Markdown source={blocksToMarkdown(s.blocks)} />
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
