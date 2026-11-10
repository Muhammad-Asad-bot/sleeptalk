import type { Metadata } from "next";
import { ColourLibraryEditor } from "@/components/admin/colour-library";
import { PageHeader } from "@/components/admin/ui";
import { requireStaff } from "@/lib/server/auth";
import { getSettings } from "@/lib/server/settings";

export const metadata: Metadata = { title: "Colours" };

export default async function ColoursPage() {
  await requireStaff("/admin/colours");
  const { colours } = await getSettings();
  return (
    <>
      <PageHeader
        title="Colours"
        description="Your shop's colours, including two-tone combinations. They appear as one-click choices when you add colours to a product. Changing or removing a colour here doesn't change products that already use it."
      />
      <ColourLibraryEditor initial={colours.list} />
    </>
  );
}
