import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { ProductEditor } from "@/components/admin/product-editor";
import { requireStaff } from "@/lib/server/auth";
import { EMPTY_PRODUCT, editorOptions } from "../_data";

export const metadata: Metadata = { title: "Add product" };

type Props = { searchParams: Promise<{ type?: string }> };

export default async function NewProductPage({ searchParams }: Props) {
  await requireStaff("/admin/products/new");
  const { type } = await searchParams;
  const options = await editorOptions();
  return (
    <>
      <PageHeader
        back={{ href: "/admin/products", label: "Products" }}
        title={type === "set" ? "New tracksuit set" : "New product"}
        description={
          type === "set" ? (
            "A set is sold as one item but takes stock from its pieces."
          ) : (
            <>
              Fill in the steps below: name and description, prices, then each colour with its photos and stock per size. It&apos;s saved as a hidden draft until you set it to Active. Creating a tracksuit set instead? <Link className="underline" href="/admin/products/new?type=set">New set</Link>
            </>
          )
        }
      />
      <ProductEditor initial={{ ...EMPTY_PRODUCT, type: type === "set" ? "set" : "standard" }} {...options} />
    </>
  );
}
