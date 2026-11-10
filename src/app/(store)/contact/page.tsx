import { contentMetadata } from "@/components/content/content-page";
import { ContactForm } from "@/components/content/contact-form";
import { Breadcrumbs } from "@/components/listing/listing-page";
import { Markdown } from "@/lib/markdown";
import { getPage, getSettings } from "@/lib/server/settings";

export const generateMetadata = () => contentMetadata("contact");

type Props = { searchParams: Promise<{ topic?: string; order?: string }> };

export default async function ContactPage({ searchParams }: Props) {
  const { topic, order } = await searchParams;
  // Pre-fill from "Request a refund" links; only accept a plausible order number.
  const orderNumber = typeof order === "string" && /^[A-Z0-9-]{3,30}$/i.test(order) ? order.toUpperCase() : undefined;
  const defaults = { subject: topic === "refund" ? "Refund request" : undefined, orderNumber };
  const [page, settings] = await Promise.all([getPage("contact"), getSettings()]);
  const { store } = settings;
  return (
    <div className="container-site pt-6 md:pt-10">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { href: "/contact", label: "Contact" }]} />
      <div className="mt-6 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h1 className="display text-5xl md:text-6xl">{page?.title ?? "Contact us"}</h1>
          {page ? <Markdown source={page.body} className="prose-st mt-6 text-sm" /> : null}
          <dl className="mt-8 space-y-4 text-sm">
            <div>
              <dt className="label text-stone">Email</dt>
              <dd className="mt-1"><a href={`mailto:${store.supportEmail}`} className="underline">{store.supportEmail}</a></dd>
            </div>
            <div>
              <dt className="label text-stone">Phone</dt>
              <dd className="mt-1">{store.phone}</dd>
            </div>
            <div>
              <dt className="label text-stone">Address</dt>
              <dd className="mt-1">{store.address}</dd>
            </div>
            <div>
              <dt className="label text-stone">Hours</dt>
              <dd className="mt-1">{store.businessHours}</dd>
            </div>
          </dl>
          {store.demoMode ? <p className="mt-6 text-xs text-stone">Placeholder contact details shown in demo mode.</p> : null}
        </div>
        <div className="lg:col-span-7 lg:col-start-6">
          {topic === "refund" ? (
            <p className="mb-6 border border-line bg-paper p-4 text-sm text-ash">
              Tell us which items you&apos;d like refunded and why. Our team reviews every request and will reply by email.
            </p>
          ) : null}
          <ContactForm defaults={defaults} />
        </div>
      </div>
    </div>
  );
}
