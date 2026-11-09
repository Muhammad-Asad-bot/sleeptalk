"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Accessible slide-in drawer: focus is moved in and trapped, Escape closes,
 * focus returns to the trigger, background scroll is locked.
 */
export function Drawer({
  open,
  onClose,
  title,
  side = "right",
  children,
  footer,
  className,
  widthClass = "w-full sm:max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  side?: "left" | "right" | "bottom";
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  widthClass?: string;
}) {
  const reduce = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>("[data-autofocus], button, a, input, select, textarea");
      focusable?.focus();
    }, 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panelRef.current) {
        const items = [...panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )].filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
      returnFocus.current?.focus?.();
    };
  }, [open, onClose]);

  const offscreen =
    side === "right" ? { x: "100%" } : side === "left" ? { x: "-100%" } : { y: "100%" };

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[60]">
          <motion.div
            className="absolute inset-0 bg-night/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.25 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn(
              "absolute flex flex-col bg-canvas shadow-2xl",
              side === "right" && "inset-y-0 right-0",
              side === "left" && "inset-y-0 left-0",
              side === "bottom" && "inset-x-0 bottom-0 max-h-[88dvh]",
              side !== "bottom" && widthClass,
              className,
            )}
            initial={offscreen}
            animate={{ x: 0, y: 0 }}
            exit={offscreen}
            transition={reduce ? { duration: 0 } : { type: "tween", ease: [0.22, 1, 0.36, 1], duration: 0.4 }}
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 id={titleId} className="label text-[0.75rem]">
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="-mr-2 grid size-10 place-items-center hover:bg-ink/5"
                aria-label="Close"
              >
                <X className="size-5" strokeWidth={1.5} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
            {footer ? <div className="border-t border-line">{footer}</div> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
