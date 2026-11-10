import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setProductStatusAction } from "@/app/admin/_actions/products";
import { ProductEditor } from "@/components/admin/product-editor";
import { abtn, Badge, Flash, PageHeader } from "@/components/admin/ui";
import { SubmitButton } from "@/components/admin/client";
import { requireStaff } from "@/lib/server/auth";
import { editorOptions, loadEditorProduct } from "../_data";

export const metadata: Metadata = { title: "Edit product" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

export default async function EditProductPage({ params, searchParams }: Props) {
  const [{ id }, flash] = await Promise.all([params, searchParams]);
  await requireStaff(`/admin/products/${id}`);
  const [product, options] = await Promise.all([loadEditorProduct(id), editorOptions()]);
  if (!product) notFound();
  return (
    <>
      <PageHeader
        back={{ href: "/admin/products", label: "Products" }}
        title={product.title}
        description={
          <span className="flex items-center gap-2">
            <Badge color={product.status === "active" ? "green" : product.status === "draft" ? "amber" : "grey"}>{product.status}</Badge>
            {product.type === "set" ? <Badge color="black">Tracksuit set</Badge> : null}
          </span>
        }
        actions={
          <>
            {product.type === "standard" ? <Link href={`/admin/inventory?q=${encodeURIComponent(product.title)}`} className={abtn("secondary")}>Manage stock</Link> : null}
            <form action={setProductStatusAction}>
              <input type="hidden" name="id" value={product.id} />
              <input type="hidden" name="status" value={product.status === "archived" ? "draft" : "archived"} />
              <SubmitButton
                className={abtn(product.status === "archived" ? "secondary" : "danger")}
                confirm={product.status === "archived" ? undefined : "Archive this product? It will be hidden from the store (you can restore it later)."}
              >
                {product.status === "archived" ? "Restore as draft" : "Archive"}
              </SubmitButton>
            </form>
          </>
        }
      />
      <Flash ok={flash.ok} error={flash.error} />
      {/* Remount with fresh data (incl. stock) after every save. */}
      <ProductEditor key={JSON.stringify(product)} initial={product} {...options} />
    </>
  );
}
