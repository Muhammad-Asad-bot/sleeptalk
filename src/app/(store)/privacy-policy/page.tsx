import { ContentPage, contentMetadata } from "@/components/content/content-page";

export const generateMetadata = () => contentMetadata("privacy-policy");

export default function PrivacyPolicyPage() {
  return <ContentPage slug="privacy-policy" />;
}
