import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { ProductGrid } from "@/components/product/product-grid";
import { NewsletterForm } from "@/components/layout/newsletter-form";
import { SocialLinks } from "@/components/layout/social-links";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { SmartImage } from "@/components/ui/smart-image";
import type { SocialSettings } from "@/content/defaults";
import type { ProductCardData } from "@/lib/server/catalog";

type Data = Record<string, unknown>;
const str = (d: Data, k: string, fallback = "") => (typeof d[k] === "string" ? (d[k] as string) : fallback);

export function HeroSection({ data, social, demoMode = false }: { data: Data; social: SocialSettings; demoMode?: boolean }) {
  const isLegacySeed =
    str(data, "eyebrow") === "Drop 01" &&
    str(data, "heading") === "Say it without saying it." &&
    str(data, "image") === "/brand/garment-back-artwork.jpg";
  const heroData = isLegacySeed
    ? {
        ...data,
        eyebrow: "New collection",
        heading: "Sleep Talk",
        subheading: "Say it without saying it.",
        ctaLabel: "Shop the collection",
        secondaryLabel: "",
      }
    : data;
  const configuredImage = str(heroData, "image");
  const usesUrbanStepsImage =
    !configuredImage ||
    configuredImage === "/brand/garment-back-artwork.jpg" ||
    configuredImage === "/images/urban-steps-hero.png";
  const image = usesUrbanStepsImage ? "/images/urban-steps-hero.webp" : configuredImage;
  const imageAlt = usesUrbanStepsImage
    ? "Model wearing a SLEEP TALK hoodie on an urban concrete staircase"
    : str(heroData, "imageAlt");
  const video = str(heroData, "video");
  return (
    <section className="on-dark relative -mt-[100px] overflow-hidden bg-night text-canvas lg:-mt-[132px] xl:-mt-[140px]" aria-labelledby="hero-heading">
      <div className="relative min-h-[100svh]">
        {/* Photo starts just below the header (soft fade at its top edge) so the model never sits behind the nav */}
        <div
          className="absolute inset-x-0 bottom-0 top-[48px] [mask-image:linear-gradient(to_bottom,transparent,black_110px)] lg:top-[72px] lg:[mask-image:linear-gradient(to_bottom,transparent,black_140px)]"
          aria-hidden={!image}
        >
          {video ? (
            <video
              className="absolute inset-0 h-full w-full object-cover opacity-80 motion-reduce:hidden"
              src={video}
              autoPlay
              muted
              loop
              playsInline
              poster={image || undefined}
              aria-hidden
            />
          ) : null}
          {image ? (
            <Image
              src={image}
              alt={imageAlt}
              fill
              priority
              sizes="100vw"
              quality={85}
              className="object-cover object-[68%_30%] opacity-95 motion-safe:animate-[fade-in_1.4s_ease_both] sm:object-[50%_35%]"
            />
          ) : null}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-night/85 via-night/30 to-night/30 lg:bg-gradient-to-r lg:from-night/80 lg:via-night/35 lg:to-night/5" aria-hidden />
        {/* Keeps the top bar and nav legible over any photo */}
        <div className="absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-night/75 via-night/35 to-transparent lg:h-64" aria-hidden />
        <div className="container-wide relative flex min-h-[100svh] flex-col justify-center pb-24 pt-[120px] lg:pb-16 lg:pt-[150px]">
          {str(heroData, "eyebrow") ? (
            <p className="mb-6 flex items-center gap-5 text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-canvas/90 motion-safe:animate-fade-up lg:text-[0.8125rem]">
              {str(heroData, "eyebrow")}
              <span className="h-px w-24 bg-canvas/60 lg:w-[135px]" aria-hidden />
            </p>
          ) : null}
          <h1
            id="hero-heading"
            className="hero-title max-w-5xl text-[15vw] motion-safe:animate-fade-up sm:text-[10vw] lg:text-[5.5rem] xl:text-[6.25rem]"
            style={{ animationDelay: "120ms" }}
          >
            {str(heroData, "heading", "Sleep Talk")}
          </h1>
          <div className="mt-3 flex flex-col items-start gap-10 lg:mt-4 lg:gap-14">
            <p
              className="max-w-xl text-sm font-medium uppercase leading-relaxed tracking-[0.32em] text-canvas/95 motion-safe:animate-fade-up sm:text-base lg:text-[1.375rem] lg:tracking-[0.4em]"
              style={{ animationDelay: "240ms" }}
            >
              {str(heroData, "subheading")}
            </p>
            <div className="flex flex-wrap gap-3 motion-safe:animate-fade-up" style={{ animationDelay: "360ms" }}>
              <ButtonLink
                href={str(heroData, "ctaHref", "/shop")}
                variant="outline-inverse"
                size="lg"
                className="h-[52px] min-w-[240px] justify-between gap-6 border-canvas/80 bg-black/10 px-8 text-[0.8125rem] tracking-[0.06em] lg:h-[58px] lg:min-w-[314px] lg:px-11 lg:text-[0.9375rem]"
              >
                {str(heroData, "ctaLabel", "Shop the collection")}
                <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
              {str(heroData, "secondaryLabel") ? (
                <ButtonLink href={str(heroData, "secondaryHref", "/collections")} variant="outline-inverse" size="lg">
                  {str(heroData, "secondaryLabel")}
                </ButtonLink>
              ) : null}
            </div>
          </div>
          <Link
            href="#cat-heading"
            className="absolute bottom-8 left-4 inline-flex items-center gap-9 text-[0.625rem] font-medium uppercase tracking-[0.14em] text-canvas/90 sm:bottom-10 md:left-8 lg:bottom-16 lg:text-[0.8125rem] xl:left-[3.75rem]"
          >
            <span className="grid size-11 place-items-center rounded-full border border-current lg:size-[44px]">
              <ArrowDown className="size-4" aria-hidden />
            </span>
            Scroll to explore
          </Link>
        </div>
        <SocialLinks
          social={social}
          compact
          showPlaceholders={demoMode}
          className="absolute bottom-[19%] right-8 z-10 hidden text-canvas md:block xl:right-[3.75rem]"
        />
      </div>
    </section>
  );
}

function SectionHeader({ heading, ctaLabel, ctaHref, eyebrow, id }: { heading: string; ctaLabel?: string; ctaHref?: string; eyebrow?: string; id?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-6 border-b border-ink pb-4 md:mb-8">
      <div>
        {eyebrow ? <p className="mb-2 text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-stone">{eyebrow}</p> : null}
        <h2 id={id} className="hero-title text-3xl md:text-5xl">{heading}</h2>
      </div>
      {ctaLabel && ctaHref ? (
        <Link href={ctaHref} className="link-underline inline-flex shrink-0 items-center gap-2 pb-1 text-xs font-semibold uppercase tracking-[0.08em]">
          {ctaLabel} <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

/** Scrolling ticker strip under the hero (a UK streetwear staple). Static when reduced motion is preferred. */
export function TickerStrip({ items }: { items: string[] }) {
  const run = [...items, ...items, ...items];
  return (
    <div className="on-dark overflow-hidden border-y border-canvas/10 bg-night py-3.5 text-canvas" role="note" aria-label={items.join(". ")}>
      <div className="flex w-max animate-[marquee_38s_linear_infinite] motion-reduce:animate-none" aria-hidden>
        {[0, 1].map((copy) => (
          <ul key={copy} className="flex shrink-0 items-center">
            {run.map((t, i) => (
              <li key={`${copy}-${i}`} className="flex items-center whitespace-nowrap px-6 text-xs font-semibold uppercase tracking-[0.18em] md:text-sm">
                {t}
                <span className="ml-12 inline-block size-1.5 rounded-full bg-canvas/50" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

export function CategoriesSection({ data, categories }: { data: Data; categories: { slug: string; name: string; image: string }[] }) {
  return (
    <section className="container-wide py-14 md:py-20" aria-labelledby="cat-heading">
      <SectionHeader id="cat-heading" heading={str(data, "heading", "Shop by category")} ctaLabel="Shop all" ctaHref="/shop" />
      <ul className="grid grid-cols-2 gap-1.5 md:grid-cols-3">
        {categories.map((c, i) => (
          <Reveal as="li" key={c.slug} delay={(i % 3) * 0.06}>
            <Link href={`/shop/${c.slug}`} className="group relative block aspect-[4/5] overflow-hidden bg-cream md:aspect-[5/6]">
              <SmartImage
                src={c.image}
                alt=""
                fill
                sizes="(min-width:768px) 33vw, 50vw"
                className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-night/70 via-night/0 to-transparent" aria-hidden />
              <div className="on-dark absolute inset-x-0 bottom-0 flex items-end justify-between p-4 text-canvas md:p-6">
                <span className="hero-title text-2xl md:text-4xl">{c.name}</span>
                <span className="grid size-9 place-items-center rounded-full border border-canvas/70 transition-colors group-hover:bg-canvas group-hover:text-ink md:size-11">
                  <ArrowRight className="size-4" aria-hidden />
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}

export function ProductRailSection({ data, products, listName }: { data: Data; products: ProductCardData[]; listName: string }) {
  if (!products.length) return null;
  return (
    <section className="container-wide py-14 md:py-20" aria-labelledby="drop-heading">
      <SectionHeader
        id="drop-heading"
        eyebrow={str(data, "eyebrow", "New collection")}
        heading={str(data, "heading", "Latest drop")}
        ctaLabel={str(data, "ctaLabel", "View all")}
        ctaHref={str(data, "ctaHref", "/new-arrivals")}
      />
      <ProductGrid products={products.slice(0, Math.floor(Math.min(products.length, 8) / 4) * 4 || products.length)} listName={listName} priorityCount={0} />
    </section>
  );
}

export function ProductGridSection({ data, products, listName }: { data: Data; products: ProductCardData[]; listName: string }) {
  if (!products.length) return null;
  return (
    <section className="container-wide py-14 md:py-20" aria-label={str(data, "heading")}>
      <SectionHeader heading={str(data, "heading")} ctaLabel={str(data, "ctaLabel")} ctaHref={str(data, "ctaHref")} />
      <ProductGrid products={products} listName={listName} priorityCount={0} />
    </section>
  );
}

export function FeaturedCollectionSection({
  data,
  collection,
  products,
}: {
  data: Data;
  collection: { slug: string; title: string; image: string; description: string } | null;
  products: ProductCardData[];
}) {
  if (!collection) return null;
  return (
    <section className="pb-14 pt-4 md:pb-20" aria-labelledby="featured-heading">
      {/* Full-bleed campaign banner */}
      <Link
        href={`/collections/${collection.slug}`}
        className="group on-dark relative block h-[70svh] max-h-[760px] min-h-[420px] overflow-hidden bg-night text-canvas"
      >
        <SmartImage
          src={collection.image}
          alt=""
          fill
          sizes="100vw"
          className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-night/85 via-night/40 to-transparent" aria-hidden />
        <div className="container-wide relative flex h-full flex-col justify-end pb-12 md:pb-16">
          <p className="mb-4 flex items-center gap-4 text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-canvas/85 md:text-[0.8125rem]">
            {str(data, "eyebrow", "Collection")}
            <span className="h-px w-20 bg-canvas/60" aria-hidden />
          </p>
          <h2 id="featured-heading" className="hero-title text-5xl md:text-8xl">
            {str(data, "heading", collection.title)}
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-canvas/80 md:text-base">{str(data, "body", collection.description)}</p>
          <span className="mt-8 inline-flex h-[52px] w-fit items-center gap-6 border border-canvas/80 px-8 text-[0.8125rem] font-semibold uppercase tracking-[0.06em] transition-colors group-hover:bg-canvas group-hover:text-ink">
            {str(data, "ctaLabel", `Shop ${collection.title}`)} <ArrowRight className="size-4" aria-hidden />
          </span>
        </div>
      </Link>
      {products.length ? (
        <div className="container-wide mt-10">
          <ProductGrid products={products} listName={`Collection: ${collection.title}`} priorityCount={0} />
        </div>
      ) : null}
    </section>
  );
}

export function BrandStorySection({ data }: { data: Data }) {
  return (
    <section className="on-dark my-8 bg-night text-canvas" aria-labelledby="story-heading">
      <div className="container-site grid items-center gap-10 py-20 md:grid-cols-12 md:py-28">
        <Reveal className="md:col-span-5">
          <div className="relative mx-auto aspect-square max-w-md">
            <Image src={str(data, "image", "/brand/moon-reflection.jpg")} alt={str(data, "imageAlt")} fill sizes="(min-width:768px) 40vw, 90vw" className="object-contain" />
          </div>
        </Reveal>
        <div className="md:col-span-6 md:col-start-7">
          <h2 id="story-heading" className="display text-5xl md:text-7xl">
            {str(data, "heading", "SAY IT WITHOUT SAYING IT.")}
          </h2>
          <p className="mt-8 max-w-lg text-lg leading-relaxed text-canvas/75">{str(data, "body")}</p>
          {str(data, "ctaLabel") ? (
            <ButtonLink href={str(data, "ctaHref", "/about")} variant="outline-inverse" className="mt-10">
              {str(data, "ctaLabel")}
            </ButtonLink>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * Campaign spotlight (admin section type "editorial"): front photo full height beside a cream
 * panel with copy and (optionally) a second photo. Photos are never cropped — boxes follow the
 * images' 3:4 ratio. Sized to fit one screen (minus the sticky header) on desktop.
 */
export function EditorialSection({ data }: { data: Data; products?: ProductCardData[] }) {
  const points = Array.isArray(data.points) ? (data.points as unknown[]).filter((p): p is string => typeof p === "string") : [];
  const image2 = str(data, "image2");

  return (
    <section
      className="bg-cream lg:grid lg:h-[calc(100svh-84px)] lg:max-h-[960px] lg:min-h-[600px] lg:grid-cols-[auto_1fr] xl:h-[calc(100svh-92px)]"
      aria-labelledby="editorial-heading"
    >
      {/* Photos: side by side on mobile; front photo as a full-height column on desktop */}
      <div className="grid grid-cols-2 gap-px bg-cream lg:contents">
        <div className="relative aspect-[1086/1448] overflow-hidden bg-[#8d8f92] lg:h-full lg:w-auto">
          <SmartImage src={str(data, "image")} alt={str(data, "imageAlt")} fill sizes="(min-width:1024px) 45vw, 50vw" className="object-contain" />
        </div>
        {image2 ? (
          <div className="relative aspect-[1086/1448] overflow-hidden bg-[#8d8f92] lg:hidden">
            <SmartImage src={image2} alt={str(data, "image2Alt")} fill sizes="50vw" className="object-contain" />
          </div>
        ) : null}
      </div>

      <div className="flex items-center px-5 py-10 sm:px-10 lg:px-12 lg:py-8 xl:px-16 2xl:px-20">
        <div className="flex w-full items-center gap-10 xl:gap-12">
          <Reveal className="min-w-0 flex-1">
            <p className="flex items-center gap-4 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ash md:text-[0.8125rem]">
              {str(data, "eyebrow", "Front to back")}
              <span className="h-px w-16 bg-ink/40 md:w-24" aria-hidden />
            </p>
            <h2 id="editorial-heading" className="hero-title mt-4 max-w-[12ch] text-[clamp(2.25rem,3.6vw,4rem)] lg:mt-5">
              {str(data, "heading", "Quiet on the front. Loud on the back.")}
            </h2>
            <p className="mt-5 max-w-md text-[0.9375rem] leading-relaxed text-charcoal lg:mt-6">{str(data, "body")}</p>

            {points.length ? (
              <ul className="mt-6 grid max-w-md gap-2.5 border-y border-ink/15 py-4 text-xs font-medium uppercase tracking-[0.06em] lg:mt-7 lg:gap-3 lg:py-5 lg:text-[0.8125rem]">
                {points.map((p) => (
                  <li key={p} className="flex items-center gap-3">
                    <span className="size-1.5 shrink-0 rounded-full bg-ink" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-4 lg:mt-8">
              {str(data, "ctaLabel") ? (
                <ButtonLink href={str(data, "ctaHref", "/shop")} variant="primary" size="lg" className="gap-5">
                  {str(data, "ctaLabel")} <ArrowRight className="size-4" aria-hidden />
                </ButtonLink>
              ) : null}
              {str(data, "secondaryLabel") ? (
                <Link
                  href={str(data, "secondaryHref", "/new-arrivals")}
                  className="link-underline inline-flex items-center gap-2 py-1 text-xs font-semibold uppercase tracking-[0.1em]"
                >
                  {str(data, "secondaryLabel")} <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              ) : null}
            </div>
          </Reveal>

          {/* Second photo inside the panel on wide screens */}
          {image2 ? (
            <Reveal delay={0.12} className="hidden w-[clamp(220px,22vw,380px)] shrink-0 xl:block">
              <div className="relative aspect-[1086/1448] overflow-hidden bg-[#8d8f92] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.45)]">
                <SmartImage src={image2} alt={str(data, "image2Alt")} fill sizes="22vw" className="object-contain" />
                  </div>
            </Reveal>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export function SocialGallerySection({ data, socialUrl }: { data: Data; socialUrl: string }) {
  const images = Array.isArray(data.images) ? (data.images as { src: string; alt: string; href?: string }[]) : [];
  if (!images.length) return null;
  return (
    <section className="py-16 md:py-24" aria-labelledby="social-heading">
      <div className="container-site mb-8 flex items-end justify-between">
        <h2 id="social-heading" className="display text-4xl md:text-6xl">
          {str(data, "heading", "Follow along")}
        </h2>
        {socialUrl ? (
          <a href={socialUrl} target="_blank" rel="noopener noreferrer" className="label link-underline text-[0.6875rem]">
            {str(data, "handle", "Instagram")}
          </a>
        ) : (
          <p className="max-w-xs text-right text-xs text-stone">{str(data, "note")}</p>
        )}
      </div>
      <ul className="grid grid-cols-3 gap-1 md:grid-cols-6">
        {images.map((img, i) => {
          const tile = (
            <div className="relative aspect-square overflow-hidden bg-cream">
              <SmartImage src={img.src} alt={img.alt} fill sizes="(min-width:768px) 16vw, 33vw" className="object-cover transition-transform duration-700 hover:scale-105" />
            </div>
          );
          return (
            <li key={`${img.src}-${i}`}>
              {img.href ? (
                <a href={img.href} target="_blank" rel="noopener noreferrer" aria-label={`${img.alt} (opens social post)`}>
                  {tile}
                </a>
              ) : (
                tile
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function NewsletterSection({ data }: { data: Data }) {
  return (
    <section className="container-site py-16 md:py-24" aria-labelledby="nl-heading">
      <div className="mx-auto max-w-2xl border border-line bg-paper px-6 py-14 text-center md:px-16">
        <Image src="/brand/moon-mark-dark.png" alt="" width={891} height={949} className="mx-auto h-14 w-auto" />
        <h2 id="nl-heading" className="display mt-6 text-5xl md:text-6xl">
          {str(data, "heading", "Hear it first")}
        </h2>
        <p className="mx-auto mt-4 max-w-sm text-sm text-ash">{str(data, "body")}</p>
        <div className="mx-auto mt-8 max-w-md text-left">
          <NewsletterForm tone="light" idPrefix="home-nl" />
        </div>
      </div>
    </section>
  );
}
