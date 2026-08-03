import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { ProductForm } from "../product-form";

type ProductEditPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProductEditPage({ params }: ProductEditPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return (
      <section className="overflow-hidden rounded-xl border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not verify your session. Please sign in again after database connectivity is restored.
        </div>
      </section>
    );
  }

  const stores = await prisma.store.findMany({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      currency: true,
    },
  });

  const product = await prisma.product.findFirst({
    where: {
      id,
      store: {
        ownerUserId: user.id,
      },
    },
    include: {
      variants: true,
    },
  });

  if (!product) {
    notFound();
  }

  const categories = await prisma.category.findMany({
    where: { storeId: { in: stores.map((store) => store.id) } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, storeId: true },
  });

  const serializedProduct = {
    ...product,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    variants: product.variants.map((variant) => ({
      ...variant,
      price: variant.price.toString(),
      compareAtPrice: variant.compareAtPrice?.toString() ?? null,
    })),
  };

  return (
    <ProductForm
      stores={stores}
      categories={categories}
      initialProduct={serializedProduct}
      selectedStoreId={product.storeId}
    />
  );
}
