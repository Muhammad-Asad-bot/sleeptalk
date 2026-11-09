import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { addresses } from "@/db/schema";
import { deleteAddressAction, setDefaultAddressAction } from "@/app/actions/account";
import { AccountShell } from "@/components/account/account-shell";
import { NewAddressToggle } from "@/components/account/account-forms";
import { requireUser } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Addresses", robots: { index: false } };

export default async function AddressesPage() {
  const user = await requireUser("/account/addresses");
  const db = await getDb();
  const rows = await db.select().from(addresses).where(eq(addresses.userId, user.id));
  return (
    <AccountShell active="/account/addresses" title="Addresses" name={user.firstName || "there"}>
      {rows.length ? (
        <ul className="mb-8 grid gap-4 sm:grid-cols-2">
          {rows.map((a) => (
            <li key={a.id} className="border border-line p-5 text-sm">
              {a.isDefault ? <p className="mb-2 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-success">Default</p> : null}
              <p className="leading-relaxed">
                {a.firstName} {a.lastName}
                <br />
                {a.line1}
                {a.line2 ? <><br />{a.line2}</> : null}
                <br />
                {a.city}{a.region ? `, ${a.region}` : ""} {a.postcode}
                <br />
                {a.country === "GB" ? "United Kingdom" : "Canada"}
              </p>
              <div className="mt-4 flex gap-4 text-xs">
                {!a.isDefault ? (
                  <form action={setDefaultAddressAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="underline underline-offset-4">Make default</button>
                  </form>
                ) : null}
                <form action={deleteAddressAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <button type="submit" className="text-sale underline underline-offset-4">Delete</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-8 text-sm text-ash">No saved addresses yet. Saved addresses can be used at checkout.</p>
      )}
      <NewAddressToggle />
    </AccountShell>
  );
}
