"use server";

import { z } from "zod";
import { cartLineSchema } from "@/lib/cart-types";
import { MARKETS } from "@/lib/markets";
import { addressSchema, emailSchema } from "@/lib/validation";
import { getCurrentUser } from "@/lib/server/auth";
import { getMarket } from "@/lib/server/market";
import { placeOrder, type PlaceOrderResult } from "@/lib/server/orders";
import { limitByIp } from "@/lib/server/security";

const checkoutSchema = z.object({
  checkoutToken: z.string().uuid(),
  email: emailSchema,
  phone: z.string().trim().max(30).optional().default(""),
  shippingAddress: addressSchema,
  billingSameAsShipping: z.boolean(),
  billingAddress: z.unknown().optional(),
  shippingRateId: z.string().min(1).max(64),
  discountCode: z.string().trim().max(40).nullable().optional(),
  lines: z.array(cartLineSchema).min(1).max(50),
});

export type CheckoutResult = PlaceOrderResult | { ok: false; error: string; fieldErrors: Record<string, string> };

/**
 * Creates the order from a server-side re-price of the bag, reserves stock and returns the
 * payment provider redirect. The market always comes from the server (cookie), never the client.
 */
export async function placeOrderAction(input: unknown): Promise<CheckoutResult> {
  const limited = await limitByIp("checkout", 15, 10 * 60_000);
  if (!limited.ok) return { ok: false, error: "Too many checkout attempts. Please wait a few minutes." };

  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".")] ??= i.message;
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
  }
  const data = parsed.data;
  const market = await getMarket();
  if (data.shippingAddress.country !== MARKETS[market].country) {
    return {
      ok: false,
      error: `Your selected country is ${MARKETS[market].label}. Change country in the header to ship elsewhere.`,
      fieldErrors: { "shippingAddress.country": "Country must match your selected market" },
    };
  }
  let billing = data.shippingAddress;
  if (!data.billingSameAsShipping) {
    const b = addressSchema.safeParse(data.billingAddress);
    if (!b.success) {
      const fieldErrors: Record<string, string> = {};
      for (const i of b.error.issues) fieldErrors[`billingAddress.${i.path.join(".")}`] ??= i.message;
      return { ok: false, error: "Please check your billing address.", fieldErrors };
    }
    billing = b.data;
  }
  const user = await getCurrentUser();
  return placeOrder({
    checkoutToken: data.checkoutToken,
    email: data.email,
    phone: data.phone || data.shippingAddress.phone || "",
    shippingAddress: data.shippingAddress,
    billingAddress: billing,
    shippingRateId: data.shippingRateId,
    discountCode: data.discountCode ?? null,
    lines: data.lines,
    market,
    userId: user?.id ?? null,
  });
}
