import { ContentPage, contentMetadata } from "@/components/content/content-page";

export const generateMetadata = () => contentMetadata("shipping");

export default function ShippingPage() {
  return <ContentPage slug="shipping" />;
}
