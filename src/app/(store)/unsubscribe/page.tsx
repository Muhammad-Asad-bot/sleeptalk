import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { unsubscribeAction } from "@/app/actions/store";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

type Props = { searchParams: Promise<{ t?: string; done?: string }> };

/** Requires an explicit click so email link scanners can't unsubscribe people by prefetching. */
export default async function UnsubscribePage({ searchParams }: Props) {
  const { t, done } = await searchParams;

  async function confirm(formData: FormData) {
    "use server";
    const token = String(formData.get("t") ?? "");
    const ok = await unsubscribeAction(token);
    redirect(`/unsubscribe?done=${ok ? "1" : "0"}`);
  }

  return (
    <div className="container-site py-24 text-center">
      {done ? (
        <>
          <h1 className="display text-5xl">{done === "1" ? "You're unsubscribed" : "Link not valid"}</h1>
          <p className="mx-auto mt-4 max-w-md text-sm text-ash">
            {done === "1"
              ? "You won't receive marketing emails from SLEEP TALK any more. Order emails will still be sent."
              : "This unsubscribe link is invalid or has already been used."}
          </p>
        </>
      ) : (
        <>
          <h1 className="display text-5xl">Unsubscribe</h1>
          <p className="mx-auto mt-4 max-w-md text-sm text-ash">Stop receiving SLEEP TALK marketing emails?</p>
          <form action={confirm} className="mt-8">
            <input type="hidden" name="t" value={t ?? ""} />
            <button type="submit" className={buttonClass("primary", "lg")} disabled={!t}>
              Unsubscribe
            </button>
          </form>
        </>
      )}
      <Link href="/" className="mt-8 inline-block text-sm underline">Back to the store</Link>
    </div>
  );
}
