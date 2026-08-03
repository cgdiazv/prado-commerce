import { prisma } from "@/lib/prisma";
import { corsJson, withCorsHeaders } from "@/lib/api-cors";

export async function OPTIONS() {
  return withCorsHeaders(new Response(null, { status: 204 }));
}

type CartSnapshot = {
  cartId: string;
  cartToken: string;
  currency: string;
  subtotal: number;
  items: Array<{
    variantId: string;
    title: string;
    price: number;
    quantity: number;
    lineTotal: number;
  }>;
};

async function buildCartSnapshotById(cartId: string): Promise<CartSnapshot | null> {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    select: {
      id: true,
      token: true,
      currency: true,
      items: {
        select: {
          variantId: true,
          quantity: true,
          variant: {
            select: {
              title: true,
              price: true,
            },
          },
        },
      },
    },
  });

  if (!cart) {
    return null;
  }

  const items = cart.items.map((item) => {
    const price = Number(item.variant.price);
    const quantity = item.quantity;

    return {
      variantId: item.variantId,
      title: item.variant.title,
      price,
      quantity,
      lineTotal: Number((price * quantity).toFixed(2)),
    };
  });

  const subtotal = Number(
    items
      .reduce((sum, item) => sum + item.lineTotal, 0)
      .toFixed(2),
  );

  return {
    cartId: cart.id,
    cartToken: cart.token,
    currency: cart.currency,
    subtotal,
    items,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const cartId = url.searchParams.get("cartId")?.trim();
    const cartToken = url.searchParams.get("cartToken")?.trim();

    if (!cartId && !cartToken) {
      return corsJson(
        { error: "cartId or cartToken is required" },
        { status: 400 },
      );
    }

    const cart = cartId
      ? await prisma.cart.findUnique({
          where: { id: cartId },
          select: { id: true },
        })
      : await prisma.cart.findUnique({
          where: { token: cartToken as string },
          select: { id: true },
        });

    if (!cart) {
      return corsJson({ error: "Cart not found" }, { status: 404 });
    }

    const snapshot = await buildCartSnapshotById(cart.id);

    if (!snapshot) {
      return corsJson({ error: "Cart not found" }, { status: 404 });
    }

    return corsJson(snapshot);
  } catch (error) {
    console.error("[CART_GET_ERROR]", error);

    return corsJson({ error: "Failed to fetch cart" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeId, currency } = body as {
      storeId?: string;
      currency?: string;
    };

    const headerStoreId = request.headers.get("x-store-id")?.trim();
    const requestedStoreId = storeId?.trim() || headerStoreId;

    if (!requestedStoreId) {
      return corsJson({ error: "storeId is required" }, { status: 400 });
    }

    const store = await prisma.store.findUnique({
      where: {
        id: requestedStoreId,
      },
      select: {
        id: true,
        currency: true,
      },
    });

    if (!store) {
      return corsJson({ error: "Store not found" }, { status: 404 });
    }

    const cart = await prisma.cart.create({
      data: {
        storeId: requestedStoreId,
        currency: currency?.trim() || store.currency,
      },
      select: {
        id: true,
        token: true,
        storeId: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return corsJson(
      {
        cart,
        cartId: cart.id,
        cartToken: cart.token,
        currency: cart.currency,
        subtotal: 0,
        items: [],
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[CART_CREATE_ERROR]", error);

    return corsJson({ error: "Failed to initialize cart" }, { status: 500 });
  }
}