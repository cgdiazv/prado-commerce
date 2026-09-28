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
      <section className="min-w-0 space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not verify your session. Please sign in again after database connectivity is restored.
        </div>
      </section>
    );
  }

  let stores = [];
  let product = null;
  let categories = [];

  try {
    stores = await prisma.store.findMany({
      where: { ownerUserId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        currency: true,
      },
    });

    product = await prisma.product.findFirst({
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

    categories = await prisma.category.findMany({
      where: { storeId: { in: stores.map((store) => store.id) } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, storeId: true },
    });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && String((error as any).digest).startsWith("NEXT_NOT_FOUND")) {
      throw error;
    }
    console.error("[PRODUCT_EDIT_PAGE_DB_ERROR]", error);
    return (
      <section className="min-w-0 space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not load product details. Please check database connectivity and refresh.
        </div>
      </section>
    );
  }

  const serializedProduct = JSON.parse(
    JSON.stringify({
      ...product,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
      variants: product.variants.map((variant) => ({
        ...variant,
        price: variant.price.toString(),
        compareAtPrice: variant.compareAtPrice?.toString() ?? null,
        createdAt: variant.createdAt.toISOString(),
        updatedAt: variant.updatedAt.toISOString(),
      })),
    })
  );

  const serializedStores = JSON.parse(JSON.stringify(stores));
  const serializedCategories = JSON.parse(JSON.stringify(categories));

  return (
    <ProductForm
      stores={serializedStores}
      categories={serializedCategories}
      initialProduct={serializedProduct}
      selectedStoreId={product.storeId}
    />
  );
}
