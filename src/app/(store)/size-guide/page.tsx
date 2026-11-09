import { ContentPage, contentMetadata } from "@/components/content/content-page";

export const generateMetadata = () => contentMetadata("size-guide");

export default function SizeGuidePage() {
  return <ContentPage slug="size-guide" />;
}
