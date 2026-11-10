import type { Metadata } from "next";
import { saveStoreSettingsAction } from "@/app/admin/_actions/settings";
import { UploadField } from "@/components/admin/upload-field";
import { abtn, adminInput, adminTextarea, AField, Card, Flash, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { requireOwner } from "@/lib/server/auth";
import { getSettings } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Store settings" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireOwner();
  const flash = await searchParams;
  const { store, seo, inventory } = await getSettings();
  return (
    <>
      <PageHeader title="Store settings" description="Brand, contact details, demo mode and search defaults. Owner only." />
      <Flash ok={flash.ok} error={flash.error} />
      <form action={saveStoreSettingsAction} className="grid gap-6 xl:grid-cols-2">
        <Card title="Brand & contact">
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <AField label="Store name"><input name="name" defaultValue={store.name} className={adminInput} /></AField>
              <AField label="Motto"><input name="motto" defaultValue={store.motto} className={adminInput} /></AField>
              <AField label="Support email"><input name="supportEmail" type="email" defaultValue={store.supportEmail} className={adminInput} /></AField>
              <AField label="Phone"><input name="phone" defaultValue={store.phone} className={adminInput} /></AField>
            </div>
            <AField label="Business address"><textarea name="address" defaultValue={store.address} className={adminTextarea} /></AField>
            <AField label="Support hours" hint="Leave empty to hide hours on the Contact page"><input name="businessHours" defaultValue={store.businessHours} className={adminInput} /></AField>
            <UploadField name="logoDark" defaultValue={store.logoDark} label="Wordmark logo — dark (for light backgrounds)" />
            <UploadField name="logoLight" defaultValue={store.logoLight} label="Wordmark logo — light (for dark backgrounds)" />
          </div>
        </Card>
        <div className="space-y-6">
          <Card title="Demo mode">
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="demoMode" defaultChecked={store.demoMode} className="mt-0.5 size-4 accent-ink" />
              <span>
                <strong>Demo mode is {store.demoMode ? "ON" : "OFF"}.</strong> While on, placeholder contact details are labelled, demo products show a notice and empty social links still show placeholder icons. Turn off before launch, once real details, photography and policies are in place.
              </span>
            </label>
          </Card>
          <Card title="Inventory display">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="showLowStock" defaultChecked={inventory.showLowStock} className="size-4 accent-ink" /> Show “Only X left” on product pages when a size is at or below its low-stock threshold</label>
          </Card>
          <Card title="Search engine defaults">
            <div className="grid gap-4">
              <AField label="Default page title"><input name="defaultTitle" defaultValue={seo.defaultTitle} className={adminInput} /></AField>
              <AField label="Title template" hint="%s is replaced with the page title"><input name="titleTemplate" defaultValue={seo.titleTemplate} className={adminInput} /></AField>
              <AField label="Default description"><textarea name="defaultDescription" defaultValue={seo.defaultDescription} className={adminTextarea} /></AField>
              <UploadField name="ogImage" defaultValue={seo.ogImage} label="Social share image (1200×630)" />
            </div>
          </Card>
          <SubmitButton className={`${abtn("primary")} w-full`}>Save settings</SubmitButton>
        </div>
      </form>
    </>
  );
}
