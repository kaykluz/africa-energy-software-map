import type { Metadata } from "next";
import { ProductProfile } from "@/components/record-pages";
import { productBySlug } from "@/lib/registry-data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = productBySlug(slug);
  return {
    alternates: { canonical: `/products/${slug}` },
    title: product?.name ?? "Product record",
    description: product?.description ?? "Africa energy-software product record.",
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <ProductProfile slug={slug} />;
}
