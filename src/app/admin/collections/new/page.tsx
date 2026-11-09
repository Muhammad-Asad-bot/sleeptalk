import CollectionEditPage from "../[id]/page";

export const metadata = { title: "New collection" };

export default function NewCollectionPage(props: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  return <CollectionEditPage params={Promise.resolve({ id: "new" })} searchParams={props.searchParams} />;
}
