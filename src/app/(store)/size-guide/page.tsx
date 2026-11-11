import { ContentPage, contentMetadata } from "@/components/content/content-page";
import { SizeChart } from "@/components/content/size-chart";

export const generateMetadata = () => contentMetadata("size-guide");

export default function SizeGuidePage() {
  return <ContentPage slug="size-guide" lead={<SizeChart />} />;
}
