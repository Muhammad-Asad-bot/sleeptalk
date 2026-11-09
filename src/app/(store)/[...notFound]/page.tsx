import { notFound } from "next/navigation";

// Routes unknown storefront paths to the branded not-found page (rendered inside the store layout).
export default function CatchAll() {
  notFound();
}
