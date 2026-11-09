import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { buttonClass } from "@/components/ui/button";
import { formatMoney } from "@/lib/markets";
import { getOrderWithItems, markOrderFailed, markOrderPaid } from "@/lib/server/orders";
import { testPaymentsAllowed } from "@/lib/server/payments";
import { safeEqual } from "@/lib/server/security";

export const metadata: Metadata = { title: "Test payment", robots: { index: false } };

type Props = { searchParams: Promise<{ order?: string; t?: string }> };

/**
 * DEVELOPMENT payment simulator. Stands in for the provider's hosted payment page.
 * The outcome is applied server-side (same code path as a verified provider webhook).
 */
export default async function TestPaymentPage({ searchParams }: Props) {
  if (!testPaymentsAllowed()) notFound();
  const { order: number, t } = await searchParams;
  if (!number || !t) notFound();
  const order = await getOrderWithItems(number);
  if (!order || order.paymentProvider !== "test" || !safeEqual(order.accessToken, t)) notFound();
  if (order.status === "paid") redirect(`/order-confirmation/${order.number}?t=${t}`);
  if (order.status !== "pending_payment") redirect(`/order-failed?order=${order.number}&t=${t}&reason=failed`);

  async function complete(formData: FormData) {
    "use server";
    if (!testPaymentsAllowed()) return;
    const outcome = formData.get("outcome");
    const fresh = await getOrderWithItems(String(formData.get("order")));
    const token = String(formData.get("t"));
    if (!fresh || fresh.paymentProvider !== "test" || !safeEqual(fresh.accessToken, token)) return;
    if (outcome === "approve") {
      await markOrderPaid(fresh.id, { ref: `test_${fresh.number}`, amount: fresh.total, currency: fresh.currency });
      redirect(`/order-confirmation/${fresh.number}?t=${token}`);
    }
    await markOrderFailed(fresh.id, "test payment declined");
    redirect(`/order-failed?order=${fresh.number}&t=${token}&reason=declined`);
  }

  return (
    <div className="container-site py-16">
      <div className="mx-auto max-w-md border border-dashed border-ink bg-paper p-8">
        <p className="label text-warning">Test payment provider</p>
        <h1 className="display mt-3 text-4xl">Simulated payment</h1>
        <p className="mt-3 text-sm text-ash">
          This page stands in for the real payment provider during development. No card is charged.
        </p>
        <dl className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between"><dt>Order</dt><dd className="font-medium">{order.number}</dd></div>
          <div className="flex justify-between"><dt>Items</dt><dd>{order.items.reduce((n, i) => n + i.quantity, 0)}</dd></div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Amount</dt><dd>{formatMoney(order.total, order.market)}</dd></div>
        </dl>
        <form action={complete} className="mt-8 grid gap-3">
          <input type="hidden" name="order" value={order.number} />
          <input type="hidden" name="t" value={t} />
          <button type="submit" name="outcome" value="approve" className={buttonClass("primary", "lg")}>
            Approve payment
          </button>
          <button type="submit" name="outcome" value="decline" className={buttonClass("secondary", "lg")}>
            Decline payment
          </button>
        </form>
      </div>
    </div>
  );
}
