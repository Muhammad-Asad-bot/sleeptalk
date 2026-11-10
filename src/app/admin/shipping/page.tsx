import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { getDb } from "@/db/client";
import { markets, shippingRates } from "@/db/schema";
import { deleteShippingRateAction, saveMarketAction, saveShippingRateAction } from "@/app/admin/_actions/settings";
import { abtn, adminInput, adminTextarea, AField, Card, Flash, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { MARKETS, minorToInput, type MarketCode } from "@/lib/markets";
import { requireStaff } from "@/lib/server/auth";

export const metadata: Metadata = { title: "Shipping & markets" };

function RateForm({ r, market }: { r?: typeof shippingRates.$inferSelect; market: MarketCode }) {
  return (
    <form action={saveShippingRateAction} className="grid items-end gap-2 md:grid-cols-12">
      {r ? <input type="hidden" name="id" value={r.id} /> : null}
      <input type="hidden" name="market" value={market} />
      <AField label="Name" className="md:col-span-3"><input name="name" required defaultValue={r?.name} placeholder="Standard delivery" className={adminInput} /></AField>
      <AField label={`Price ${MARKETS[market].currencySymbol}`} className="md:col-span-1"><input name="price" inputMode="decimal" required defaultValue={minorToInput(r?.price)} className={adminInput} /></AField>
      <AField label="Free over" className="md:col-span-1"><input name="freeOver" inputMode="decimal" defaultValue={minorToInput(r?.freeOver)} placeholder="—" className={adminInput} /></AField>
      <AField label="Days min" className="md:col-span-1"><input name="minDays" type="number" min={0} defaultValue={r?.minDays ?? ""} className={adminInput} /></AField>
      <AField label="Days max" className="md:col-span-1"><input name="maxDays" type="number" min={0} defaultValue={r?.maxDays ?? ""} className={adminInput} /></AField>
      <AField label="Note shown at checkout" className="md:col-span-3"><input name="description" defaultValue={r?.description} className={adminInput} /></AField>
      <label className="flex items-center gap-1.5 pb-2 text-xs md:col-span-1"><input type="checkbox" name="active" defaultChecked={r?.active ?? true} className="size-4 accent-ink" /> Active</label>
      <div className="flex gap-1 md:col-span-1">
        <SubmitButton className={abtn(r ? "secondary" : "primary", "sm")}>{r ? "Save" : "Add"}</SubmitButton>
      </div>
      <input type="hidden" name="position" value={r?.position ?? 99} />
    </form>
  );
}

export default async function ShippingPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff("/admin/shipping");
  const flash = await searchParams;
  const db = await getDb();
  const [rates, mkts] = await Promise.all([db.select().from(shippingRates).orderBy(asc(shippingRates.position)), db.select().from(markets).orderBy(asc(markets.code))]);
  return (
    <>
      <PageHeader
        title="Shipping & markets"
        description="Delivery options, prices and free-shipping thresholds per market. Leave delivery days empty until carrier times are confirmed — no estimate is shown then."
      />
      <Flash ok={flash.ok} error={flash.error} />
      <div className="space-y-6">
        {mkts.map((m) => (
          <Card key={m.code} title={`${MARKETS[m.code].label} (${m.currency})`}>
            <form action={saveMarketAction} className="mb-6 grid gap-3 border-b border-line pb-6 md:grid-cols-3">
              <input type="hidden" name="code" value={m.code} />
              <AField label="Market name"><input name="name" defaultValue={m.name} className={adminInput} /></AField>
              <div className="flex items-end gap-4 pb-2 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={m.active} className="size-4 accent-ink" /> Selling here</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="isDefault" defaultChecked={m.isDefault} className="size-4 accent-ink" /> Default market</label>
              </div>
              <div />
              <AField label="Shipping summary (product pages)"><textarea name="shippingSummary" defaultValue={m.shippingSummary} className={adminTextarea} /></AField>
              <AField label="Returns summary (product pages)"><textarea name="returnsSummary" defaultValue={m.returnsSummary} className={adminTextarea} /></AField>
              <AField label="Taxes & duties note (bag/checkout)"><textarea name="taxNote" defaultValue={m.taxNote} className={adminTextarea} /></AField>
              <div><SubmitButton className={abtn("secondary", "sm")}>Save market</SubmitButton></div>
            </form>
            <p className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-ash">Delivery options</p>
            <div className="space-y-4">
              {rates.filter((r) => r.market === m.code).map((r) => (
                <div key={r.id} className="flex flex-col gap-2 border border-line bg-white/60 p-3">
                  <RateForm r={r} market={m.code} />
                  <form action={deleteShippingRateAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <SubmitButton className="inline-flex items-center gap-1 text-xs text-sale underline" confirm="Delete this delivery option? Customers will no longer see it at checkout.">Delete rate</SubmitButton>
                  </form>
                </div>
              ))}
              <div className="border border-dashed border-line p-3">
                <p className="mb-2 text-xs font-medium">Add a delivery option</p>
                <RateForm market={m.code} />
              </div>
            </div>
          </Card>
        ))}
      </div>
      <p className="mt-6 text-xs text-stone">Live carrier rates and label purchasing are out of scope until carriers are confirmed. Market currency and checkout country are fixed per market ({Object.values(MARKETS).map((x) => `${x.code}: ${x.currency}`).join(", ")}).</p>
    </>
  );
}
