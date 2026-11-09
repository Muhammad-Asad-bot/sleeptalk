import Image from "next/image";

/** Split layout for sign-in / register / reset pages. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-[calc(100svh-140px)] lg:grid-cols-2">
      <div className="on-dark relative hidden overflow-hidden bg-night lg:block">
        <Image src="/images/urban-steps-hero.png" alt="" fill sizes="50vw" className="object-cover object-[60%_30%] opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-night/80 via-night/20 to-night/30" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 p-12 text-canvas">
          <p className="hero-title text-5xl">Say it without saying it.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-5 py-14 sm:px-10">
        <div className="w-full max-w-md">
          <h1 className="hero-title text-4xl md:text-5xl">{title}</h1>
          {subtitle ? <p className="mt-3 text-sm text-ash">{subtitle}</p> : null}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
