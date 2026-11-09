import { ContentPage, contentMetadata } from "@/components/content/content-page";

export const generateMetadata = () => contentMetadata("about");

export default function AboutPage() {
  return <ContentPage slug="about" />;
}
