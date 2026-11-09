import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/listing/listing-page";
import { TrackOrderForm } from "@/components/content/track-order-form";

export const metadata: Metadata = { title: "Track your order", alternates: { canonical: "/track-order" } };

export default function TrackOrderPage() {
  return (
    <div className="container-site pt-6 md:pt-10">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/track-order", label: "Track your order" }]} />
      <div className="mx-auto mt-10 max-w-md">
        <h1 className="display text-5xl">Track your order</h1>
        <p className="mt-4 text-sm text-ash">Enter your order number and the email address you used at checkout.</p>
        <div className="mt-8">
          <TrackOrderForm />
        </div>
      </div>
    </div>
  );
}
