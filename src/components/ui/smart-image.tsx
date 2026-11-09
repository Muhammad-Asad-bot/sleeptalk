"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { isRemoteDemoUrl } from "@/content/demo-assets";
import { cn } from "@/lib/utils";

export const PLACEHOLDER_IMAGE = "/images/demo/placeholder.jpg";

/**
 * next/image wrapper that
 *  - falls back to a branded placeholder if a (temporary, third-party) image fails to load
 *  - tags third-party demo imagery as "Demo image" so it's never presented as SLEEP TALK product
 */
export function SmartImage({
  src,
  alt,
  className,
  showDemoTag = true,
  ...props
}: Omit<ImageProps, "src"> & { src: string | null | undefined; showDemoTag?: boolean }) {
  const [failed, setFailed] = useState(false);
  const url = !src || failed ? PLACEHOLDER_IMAGE : src;
  const isRemoteDemo = !!src && !failed && isRemoteDemoUrl(src);
  return (
    <>
      <Image
        src={url}
        alt={alt}
        className={className}
        onError={() => setFailed(true)}
        {...props}
      />
      {isRemoteDemo && showDemoTag ? (
        <span
          className={cn(
            "pointer-events-none absolute bottom-2 right-2 z-[1] bg-ink/75 px-1.5 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-[0.12em] text-canvas",
          )}
        >
          Demo image
        </span>
      ) : null}
    </>
  );
}
