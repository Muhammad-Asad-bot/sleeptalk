import { ContentPage, contentMetadata } from "@/components/content/content-page";

export const generateMetadata = () => contentMetadata("cookie-policy");

export default function CookiePolicyPage() {
  return <ContentPage slug="cookie-policy" />;
}
