import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { OrderDetail } from "@/components/account/order-detail";
import { requireUser } from "@/lib/server/auth";
import { getOrderForViewer } from "@/lib/server/orders";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Order details", robots: { index: false } };

type Props = { params: Promise<{ number: string }> };

export default async function AccountOrderPage({ params }: Props) {
  const { number } = await params;
  const user = await requireUser(`/account/orders/${number}`);
  // Ownership enforced: only the signed-in owner can view (no IDOR via order number).
  const order = await getOrderForViewer(number, null, user.id);
  if (!order) notFound();
  return (
    <AccountShell active="/account/orders" title={`Order ${order.number}`} name={user.firstName || "there"}>
      <p className="mb-6 text-sm text-ash">Placed {formatDate(order.createdAt)} · <Link href="/account/orders" className="underline">All orders</Link></p>
      <OrderDetail order={order} />
    </AccountShell>
  );
}
