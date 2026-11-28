import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { resolveServerActiveStoreId } from "@/lib/server-active-store";
import {
  AbandonedCartsDashboard,
  type AbandonedCartRecord,
} from "./abandoned-carts-dashboard";

type Props = { searchParams?: Promise<{ storeId?: string }> };

export default async function AbandonedCartsPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  if (!user) {
    return (
      <AbandonedCartsDashboard
        initialStores={[]}
        initialCarts={[]}
        selectedStoreId={null}
        setupError="Could not verify your session."
      />
    );
  }

  let stores: Array<{ id: string; name: string; slug: string; currency: string }> = [];
  let selectedStoreId: string | null = null;
  let serializedCarts: AbandonedCartRecord[] = [];
  let setupError: string | null = null;

  try {
    stores = await prisma.store.findMany({
      where: {
        OR: [{ ownerUserId: user.id }, { ownerId: user.id }],
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, slug: true, currency: true },
    });

    selectedStoreId = await resolveServerActiveStoreId(
      resolvedSearchParams?.storeId,
      stores,
    );

    const storeIds = stores.map((s) => s.id);

    if (storeIds.length > 0) {
      const carts = await prisma.cart.findMany({
        where: {
          storeId: { in: storeIds },
          items: { some: {} },
        },
        include: {
          store: {
            select: { id: true, name: true, slug: true, currency: true },
          },
          customer: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
          items: {
            include: {
              variant: {
                select: {
                  id: true,
                  title: true,
                  sku: true,
                  price: true,
                  product: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      const nowMs = Date.now();
      serializedCarts = carts.map((cart) => {
        const items = cart.items.map((item) => {
          const productTitle = item.variant.product.title;
          const variantTitle = item.variant.title;
          const fullTitle =
            variantTitle &&
            variantTitle.toLowerCase() !== "default" &&
            variantTitle.toLowerCase() !== productTitle.toLowerCase()
              ? `${productTitle} (${variantTitle})`
              : productTitle;
          const unitPrice = Number(item.variant.price);
          return {
            id: item.id,
            variantId: item.variantId,
            title: fullTitle,
            sku: item.variant.sku,
            quantity: item.quantity,
            price: unitPrice.toFixed(2),
            lineTotal: (unitPrice * item.quantity).toFixed(2),
          };
        });

        const itemsCount = items.reduce((sum, i) => sum + i.quantity, 0);
        const subtotal = items.reduce((sum, i) => sum + Number(i.lineTotal), 0);
        const idleMinutes = Math.max(
          0,
          Math.floor((nowMs - cart.updatedAt.getTime()) / 60000),
        );

        return {
          id: cart.id,
          token: cart.token,
          storeId: cart.storeId,
          storeName: cart.store.name,
          storeSlug: cart.store.slug,
          customerId: cart.customerId,
          customerEmail: cart.customer?.email ?? null,
          customerName:
            [cart.customer?.firstName, cart.customer?.lastName]
              .filter(Boolean)
              .join(" ") || null,
          customerPhone: cart.customer?.phone ?? null,
          currency: cart.currency || cart.store.currency || "USD",
          itemsCount,
          subtotal: subtotal.toFixed(2),
          status: idleMinutes >= 30 ? "ABANDONED" : "ACTIVE",
          idleMinutes,
          items,
          createdAt: cart.createdAt.toISOString(),
          updatedAt: cart.updatedAt.toISOString(),
        };
      });
    }
  } catch (error) {
    console.error("[ABANDONED_CARTS_PAGE_ERROR]", error);
    setupError = "Could not load abandoned carts from the database.";
  }

  return (
    <AbandonedCartsDashboard
      initialStores={stores}
      initialCarts={serializedCarts}
      selectedStoreId={selectedStoreId}
      setupError={setupError}
    />
  );
}
