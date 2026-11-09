"use client";

import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SmartImage } from "@/components/ui/smart-image";
import type { CatalogImage } from "@/lib/server/catalog";
import { cn } from "@/lib/utils";

/** Images for the selected colour first, then colour-neutral images (detail/lifestyle). */
export function imagesForColour(images: CatalogImage[], colour: string | null) {
  const matching = images.filter((i) => colour && i.color === colour);
  const neutral = images.filter((i) => !i.color);
  const list = [...matching, ...neutral];
  return list.length ? list : images;
}

export function ProductGallery({ images, colour, title }: { images: CatalogImage[]; colour: string | null; title: string }) {
  const list = useMemo(() => imagesForColour(images, colour), [images, colour]);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset to first image on colour change
    setActive(0);
    scroller.current?.scrollTo({ left: 0 });
  }, [colour]);

  const go = (i: number) => {
    const next = (i + list.length) % list.length;
    setActive(next);
    const el = scroller.current;
    if (el) el.scrollTo({ left: next * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className="lg:grid lg:grid-cols-[72px_1fr] lg:gap-4">
      {/* Thumbnails (desktop) */}
      <ul className="hidden max-h-[80vh] flex-col gap-2 overflow-y-auto lg:flex" aria-label="Product images">
        {list.map((img, i) => (
          <li key={img.id}>
            <button
              type="button"
              onClick={() => go(i)}
              aria-label={`Show image ${i + 1} of ${list.length}`}
              aria-current={i === active}
              className={cn("relative block aspect-[4/5] w-full overflow-hidden bg-cream", i === active ? "ring-1 ring-ink" : "opacity-70 hover:opacity-100")}
            >
              <SmartImage src={img.url} alt="" fill sizes="72px" className="object-cover" showDemoTag={false} />
            </button>
          </li>
        ))}
      </ul>

      <div className="relative">
        <div
          ref={scroller}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(e) => {
            const el = e.currentTarget;
            const i = Math.round(el.scrollLeft / el.clientWidth);
            if (i !== active) setActive(i);
          }}
          aria-roledescription="carousel"
          aria-label={`${title} images`}
        >
          {list.map((img, i) => (
            <div key={img.id} className="relative aspect-[4/5] w-full shrink-0 snap-center bg-cream" aria-roledescription="slide" aria-label={`${i + 1} of ${list.length}`}>
              <button type="button" className="absolute inset-0 cursor-zoom-in" onClick={() => setLightbox(true)} aria-label={`Zoom image ${i + 1}`}>
                <SmartImage src={img.url} alt={img.alt || title} fill priority={i === 0} sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
              </button>
            </div>
          ))}
        </div>
        {list.length > 1 ? (
          <>
            <div className="pointer-events-none absolute inset-x-3 top-1/2 hidden -translate-y-1/2 justify-between md:flex">
              <button type="button" onClick={() => go(active - 1)} className="pointer-events-auto grid size-10 place-items-center bg-canvas/85 hover:bg-canvas" aria-label="Previous image">
                <ChevronLeft className="size-5" />
              </button>
              <button type="button" onClick={() => go(active + 1)} className="pointer-events-auto grid size-10 place-items-center bg-canvas/85 hover:bg-canvas" aria-label="Next image">
                <ChevronRight className="size-5" />
              </button>
            </div>
            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 lg:hidden" aria-hidden>
              {list.map((img, i) => (
                <span key={img.id} className={cn("h-0.5 w-5 transition-colors", i === active ? "bg-ink" : "bg-ink/25")} />
              ))}
            </div>
          </>
        ) : null}
        <span className="pointer-events-none absolute left-3 top-3 hidden items-center gap-1 bg-canvas/85 px-2 py-1 text-[0.625rem] uppercase tracking-[0.12em] md:inline-flex">
          <ZoomIn className="size-3" /> Click to zoom
        </span>
      </div>

      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {lightbox ? (
                <Lightbox images={list} index={active} onIndex={go} onClose={() => setLightbox(false)} title={title} />
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}

function Lightbox({ images, index, onIndex, onClose, title }: { images: CatalogImage[]; index: number; onIndex: (i: number) => void; onClose: () => void; title: string }) {
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex(index + 1);
      if (e.key === "ArrowLeft") onIndex(index - 1);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [index, onClose, onIndex]);
  const img = images[index];
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — image viewer`}
      className="fixed inset-0 z-[80] bg-canvas"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
        <p className="label text-stone">{index + 1} / {images.length}</p>
        <button ref={closeRef} type="button" onClick={onClose} className="grid size-11 place-items-center bg-canvas hover:bg-cream" aria-label="Close image viewer">
          <X className="size-5" />
        </button>
      </div>
      <button
        type="button"
        className={cn("relative h-full w-full overflow-hidden", zoom ? "cursor-zoom-out" : "cursor-zoom-in")}
        onClick={() => setZoom((z) => !z)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
        }}
        aria-label={zoom ? "Zoom out" : "Zoom in"}
      >
        <div className="absolute inset-0 transition-transform duration-300" style={{ transform: zoom ? "scale(2)" : "none", transformOrigin: origin }}>
          <SmartImage src={img.url} alt={img.alt || title} fill sizes="100vw" quality={85} className="object-contain" />
        </div>
      </button>
      {images.length > 1 ? (
        <>
          <button type="button" onClick={() => onIndex(index - 1)} className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center bg-canvas/90" aria-label="Previous image">
            <ChevronLeft className="size-5" />
          </button>
          <button type="button" onClick={() => onIndex(index + 1)} className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center bg-canvas/90" aria-label="Next image">
            <ChevronRight className="size-5" />
          </button>
        </>
      ) : null}
    </motion.div>
  );
}
