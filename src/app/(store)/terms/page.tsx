import { ContentPage, contentMetadata } from "@/components/content/content-page";

export const generateMetadata = () => contentMetadata("terms");

export default function TermsPage() {
  return <ContentPage slug="terms" />;
}
