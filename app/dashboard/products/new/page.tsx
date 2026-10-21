import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { resolveServerActiveStoreId } from "@/lib/server-active-store";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
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

  try {
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

    const selectedStoreId = await resolveServerActiveStoreId(undefined, stores, { allowAll: false });

    const categories = await prisma.category.findMany({
      where: { storeId: { in: stores.map((s) => s.id) } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, storeId: true },
    });

    const brands = await prisma.brand.findMany({
      where: { storeId: { in: stores.map((s) => s.id) } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, storeId: true },
    });

    return (
      <ProductForm
        stores={stores}
        categories={categories}
        brands={brands}
        selectedStoreId={selectedStoreId}
      />
    );
  } catch (error) {
    console.error("[NEW_PRODUCT_PAGE_DB_ERROR]", error);
    return (
      <section className="min-w-0 space-y-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Could not load store information for new product. Please check database connectivity and refresh.
        </div>
      </section>
    );
  }
}
