import Image from "next/image";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-site flex min-h-[70svh] flex-col items-center justify-center py-20 text-center">
      <Image src="/brand/moon-mark-dark.png" alt="" width={891} height={949} className="h-24 w-auto opacity-90" />
      <p className="label mt-10 text-stone">Error 404</p>
      <h1 className="display mt-3 text-6xl md:text-8xl">Lost in the dark</h1>
      <p className="mx-auto mt-5 max-w-md text-sm text-ash">
        The page you&apos;re looking for has moved, sold out, or never existed. Some things are better left unsaid.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/shop" className={buttonClass("primary", "lg")}>Shop all</Link>
        <Link href="/" className={buttonClass("secondary", "lg")}>Back home</Link>
      </div>
    </div>
  );
}
