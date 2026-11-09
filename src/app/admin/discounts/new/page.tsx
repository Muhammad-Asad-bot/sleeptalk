import DiscountEditPage from "../[id]/page";

export const metadata = { title: "New discount" };

export default function NewDiscountPage(props: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  return <DiscountEditPage params={Promise.resolve({ id: "new" })} searchParams={props.searchParams} />;
}
