import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/listing/listing-page";
import { Reveal } from "@/components/ui/reveal";
import { SmartImage } from "@/components/ui/smart-image";
import { getLiveCollections } from "@/lib/server/catalog";
import { getMarket } from "@/lib/server/market";

export const metadata: Metadata = {
  title: "Collections",
  description: "SLEEP TALK collections and drops.",
  alternates: { canonical: "/collections" },
};

export default async function CollectionsPage() {
  const market = await getMarket();
  const collections = await getLiveCollections(market);
  return (
    <div className="container-site pt-6 md:pt-10">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/collections", label: "Collections" }]} />
      <h1 className="display mb-10 mt-6 text-5xl sm:text-6xl md:text-7xl">Collections</h1>
      {collections.length ? (
        <ul className="grid gap-x-5 gap-y-12 md:grid-cols-2">
          {collections.map((c, i) => (
            <Reveal as="li" key={c.id} delay={(i % 2) * 0.08}>
              <Link href={`/collections/${c.slug}`} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden bg-night">
                  <SmartImage src={c.image} alt="" fill sizes="(min-width:768px) 50vw, 100vw" className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]" />
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-4">
                  <h2 className="display text-4xl">{c.title}</h2>
                  <span className="text-xs text-stone">{c.productIds.length} pieces</span>
                </div>
                <p className="mt-2 max-w-lg text-sm text-ash">{c.description}</p>
              </Link>
            </Reveal>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ash">New collections are coming soon.</p>
      )}
    </div>
  );
}
