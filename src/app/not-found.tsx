import Image from "next/image";
import Link from "next/link";

/** Fallback for paths outside the storefront layout (e.g. /admin/*, /404). */
export default function RootNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 text-center">
      <Image src="/brand/moon-mark-dark.png" alt="" width={891} height={949} className="h-20 w-auto" />
      <p className="label mt-8 text-stone">Error 404</p>
      <h1 className="display mt-3 text-6xl">Lost in the dark</h1>
      <p className="mt-4 max-w-sm text-sm text-ash">This page doesn&apos;t exist.</p>
      <Link href="/" className="mt-8 text-sm underline underline-offset-4">Back to SLEEP TALK</Link>
    </div>
  );
}
