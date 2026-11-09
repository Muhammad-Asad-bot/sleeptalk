import { ContentPage, contentMetadata } from "@/components/content/content-page";

export const generateMetadata = () => contentMetadata("returns");

export default function ReturnsPage() {
  return <ContentPage slug="returns" />;
}
