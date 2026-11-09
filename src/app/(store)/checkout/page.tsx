import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { addresses } from "@/db/schema";
import { CheckoutView } from "@/components/checkout/checkout-view";
import { MARKETS } from "@/lib/markets";
import { getCurrentUser } from "@/lib/server/auth";
import { getMarket } from "@/lib/server/market";
import { activeProvider } from "@/lib/server/payments";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const [market, user] = await Promise.all([getMarket(), getCurrentUser()]);
  const saved = user
    ? await (await getDb()).select().from(addresses).where(eq(addresses.userId, user.id))
    : [];
  return (
    <CheckoutView
      country={MARKETS[market].country}
      countryLabel={MARKETS[market].label}
      user={user ? { email: user.email, firstName: user.firstName, lastName: user.lastName } : null}
      savedAddresses={saved
        .filter((a) => a.country === MARKETS[market].country)
        .map((a) => ({
          id: a.id,
          firstName: a.firstName,
          lastName: a.lastName,
          line1: a.line1,
          line2: a.line2,
          city: a.city,
          region: a.region,
          postcode: a.postcode,
          country: a.country,
          phone: a.phone,
          isDefault: a.isDefault,
        }))}
      testMode={activeProvider() === "test"}
    />
  );
}
