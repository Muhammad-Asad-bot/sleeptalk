import type { Metadata } from "next";
import { saveSocialAction } from "@/app/admin/_actions/content";
import { SocialGlyph } from "@/components/layout/social-links";
import { abtn, adminInput, Card, Flash, PageHeader } from "@/components/admin/ui";
import type { SocialSettings } from "@/content/defaults";
import { requireStaff } from "@/lib/server/auth";
import { getSettings } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Social links" };

const NETWORKS: { key: keyof SocialSettings; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "https://www.instagram.com/yourhandle" },
  { key: "tiktok", label: "TikTok", placeholder: "https://www.tiktok.com/@yourhandle" },
  { key: "facebook", label: "Facebook", placeholder: "https://www.facebook.com/yourpage" },
  { key: "youtube", label: "YouTube", placeholder: "https://www.youtube.com/@yourchannel" },
  { key: "pinterest", label: "Pinterest", placeholder: "https://www.pinterest.com/yourprofile" },
];

export default async function SocialLinksPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff("/admin/social-links");
  const flash = await searchParams;
  const { social, store } = await getSettings();
  return (
    <>
      <PageHeader
        title="Social links"
        description={`Used by the icons on the homepage hero and in the footer. ${store.demoMode ? "In demo mode, empty links still show as placeholder icons." : "Networks without a link are hidden."}`}
      />
      <Flash ok={flash.ok} error={flash.error} />
      <form action={saveSocialAction} className="max-w-2xl">
        <Card>
          <div className="space-y-4">
            {NETWORKS.map((n) => (
              <label key={n.key} className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center border border-line bg-white"><SocialGlyph name={n.key} size={20} /></span>
                <span className="w-24 shrink-0 text-sm font-medium">{n.label}</span>
                <input name={n.key} type="url" defaultValue={social[n.key]} placeholder={n.placeholder} className={adminInput} />
              </label>
            ))}
            <button type="submit" className={abtn("primary")}>Save social links</button>
          </div>
        </Card>
      </form>
    </>
  );
}
