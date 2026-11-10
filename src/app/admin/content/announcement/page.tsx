import type { Metadata } from "next";
import { saveAnnouncementAction } from "@/app/admin/_actions/content";
import { abtn, adminInput, adminTextarea, AField, Card, Flash, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { requireStaff } from "@/lib/server/auth";
import { getSettings } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Announcement bar" };

export default async function AnnouncementPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff("/admin/content/announcement");
  const flash = await searchParams;
  const { announcement } = await getSettings();
  return (
    <>
      <PageHeader back={{ href: "/admin/content", label: "Homepage" }} title="Announcement bar" description="The centre of the black top bar. Several messages rotate every few seconds. The free-shipping note on the left comes from Shipping & markets." />
      <Flash ok={flash.ok} error={flash.error} />
      <form action={saveAnnouncementAction} className="max-w-2xl">
        <Card>
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={announcement.enabled} className="size-4 accent-ink" /> Show messages</label>
            <AField label="Messages" hint="One per line (max 6). Never promise delivery times or free shipping that isn't confirmed.">
              <textarea name="messages" defaultValue={announcement.messages.join("\n")} className={`${adminTextarea} min-h-32`} />
            </AField>
            <AField label="Link (optional)" hint="Where the message links to, e.g. /new-arrivals"><input name="link" defaultValue={announcement.link} className={adminInput} /></AField>
            <SubmitButton className={abtn("primary")}>Save</SubmitButton>
          </div>
        </Card>
      </form>
    </>
  );
}
