import type { Metadata } from "next";
import Link from "next/link";
import { ResetCheckoutToken } from "@/components/checkout/order-effects";
import { buttonClass } from "@/components/ui/button";
import { cancelPendingOrder } from "@/lib/server/orders";

export const metadata: Metadata = { title: "Payment not completed", robots: { index: false } };

type Props = { searchParams: Promise<{ order?: string; t?: string; reason?: string }> };

const MESSAGES: Record<string, string> = {
  cancelled: "You left the payment page before paying.",
  declined: "Your payment was declined.",
  failed: "The payment couldn't be completed.",
};

export default async function OrderFailedPage({ searchParams }: Props) {
  const { order: number, t, reason = "failed" } = await searchParams;
  // Release the reservation for an abandoned attempt (token-protected, idempotent).
  const order = number && t ? await cancelPendingOrder(number, t) : null;
  const alreadyPaid = order?.status === "paid";
  return (
    <div className="container-site py-24">
      <ResetCheckoutToken />
      <div className="mx-auto max-w-lg text-center">
        {alreadyPaid ? (
          <>
            <h1 className="display text-5xl">Your order is paid</h1>
            <p className="mt-4 text-sm text-ash">Good news — payment for order {order.number} went through.</p>
            <Link href={`/order-confirmation/${order.number}?t=${t}`} className={buttonClass("primary", "lg", "mt-8")}>View order</Link>
          </>
        ) : (
          <>
            <p className="label text-stone">{order ? `Order ${order.number}` : "Checkout"}</p>
            <h1 className="display mt-3 text-5xl md:text-6xl">Payment not completed</h1>
            <p className="mt-4 text-sm text-ash">{MESSAGES[reason] ?? MESSAGES.failed} You haven&apos;t been charged and your bag has been saved.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/checkout" className={buttonClass("primary", "lg")}>Try again</Link>
              <Link href="/cart" className={buttonClass("secondary", "lg")}>Return to bag</Link>
            </div>
            <p className="mt-6 text-xs text-stone">
              Still having trouble? <Link href="/contact" className="underline">Contact us</Link>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
