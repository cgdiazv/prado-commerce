import { prisma } from "@/lib/prisma";
import { corsJson, withCorsHeaders } from "@/lib/api-cors";

export async function OPTIONS() {
  return withCorsHeaders(new Response(null, { status: 204 }));
}

type CartRecord = {
  id: string;
  storeId: string;
  token: string;
  currency: string;
};

type CartSnapshotSourceItem = {
  variantId: string;
  quantity: number;
  variant: {
    title: string;
    price: unknown;
  };
};

async function findCart(input: {
  cartId?: string;
  cartToken?: string;
}): Promise<CartRecord | null> {
  const { cartId, cartToken } = input;

  if (cartId) {
    return prisma.cart.findUnique({
      where: { id: cartId },
      select: {
        id: true,
        storeId: true,
        token: true,
        currency: true,
      },
    });
  }

  if (cartToken) {
    return prisma.cart.findUnique({
      where: { token: cartToken },
      select: {
        id: true,
        storeId: true,
        token: true,
        currency: true,
      },
    });
  }

  return null;
}

async function buildCartSnapshot(cartId: string) {
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

  const items = (cart.items as CartSnapshotSourceItem[]).map((item: CartSnapshotSourceItem) => {
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

async function resolveStoreId(request: Request, bodyStoreId?: string) {
  return bodyStoreId?.trim() || request.headers.get("x-store-id")?.trim() || null;
}

async function maybeValidatePublishableKey(request: Request, storeId: string) {
  const publishableKey = request.headers.get("x-publishable-key")?.trim();
  if (!publishableKey) {
    return true;
  }

  const apiKey = await prisma.apiKey.findFirst({
    where: {
      storeId,
      key: publishableKey,
      type: "PUBLISHABLE",
    },
    select: {
      id: true,
      expiresAt: true,
    },
  });

  if (!apiKey) {
    return false;
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return false;
  }

  return true;
}

async function getVariantForStore(variantId: string, storeId: string) {
  return prisma.productVariant.findFirst({
    where: {
      id: variantId,
      product: {
        storeId,
      },
    },
    select: {
      id: true,
      title: true,
      price: true,
      productId: true,
    },
  });
}

async function applyItemQuantity(input: {
  cart: CartRecord;
  variantId: string;
  quantity: number;
}) {
  const { cart, variantId, quantity } = input;

  if (quantity <= 0) {
    await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        variantId,
      },
    });

    return null;
  }

  return prisma.cartItem.upsert({
    where: {
      cartId_variantId: {
        cartId: cart.id,
        variantId,
      },
    },
    create: {
      cartId: cart.id,
      variantId,
      quantity,
    },
    update: {
      quantity,
    },
    include: {
      variant: {
        select: {
          id: true,
          title: true,
          price: true,
          sku: true,
        },
      },
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cartToken, cartId, storeId, variantId, quantity } = body as {
      cartToken?: string;
      cartId?: string;
      storeId?: string;
      variantId?: string;
      quantity?: number;
    };

    if (!variantId) {
      return corsJson(
        { error: "variantId is required" },
        { status: 400 },
      );
    }

    let cart = await findCart({
      cartId: cartId?.trim(),
      cartToken: cartToken?.trim(),
    });

    if (!cart) {
      const requestStoreId = await resolveStoreId(request, storeId);
      if (!requestStoreId) {
        return corsJson(
          { error: "cartId/cartToken or storeId is required" },
          { status: 400 },
        );
      }

      const store = await prisma.store.findUnique({
        where: { id: requestStoreId },
        select: { id: true, currency: true },
      });

      if (!store) {
        return corsJson({ error: "Store not found" }, { status: 404 });
      }

      const hasValidKey = await maybeValidatePublishableKey(request, store.id);
      if (!hasValidKey) {
        return corsJson({ error: "Invalid publishable key" }, { status: 401 });
      }

      cart = await prisma.cart.create({
        data: {
          storeId: store.id,
          currency: store.currency,
        },
        select: {
          id: true,
          storeId: true,
          token: true,
          currency: true,
        },
      });
    }

    const hasValidKey = await maybeValidatePublishableKey(request, cart.storeId);
    if (!hasValidKey) {
      return corsJson({ error: "Invalid publishable key" }, { status: 401 });
    }

    const variant = await getVariantForStore(variantId, cart.storeId);

    if (!variant) {
      return corsJson({ error: "Variant not found" }, { status: 404 });
    }

    const numericQuantity = Math.floor(quantity ?? 1);
    const usesLegacyTokenMode = Boolean(cartToken && !cartId);

    let finalQuantity = 1;
    if (usesLegacyTokenMode) {
      finalQuantity = Math.max(0, numericQuantity);
    } else {
      const requestedDelta = Math.max(1, numericQuantity);
      const existing = await prisma.cartItem.findUnique({
        where: {
          cartId_variantId: {
            cartId: cart.id,
            variantId: variant.id,
          },
        },
        select: {
          quantity: true,
        },
      });

      finalQuantity = (existing?.quantity ?? 0) + requestedDelta;
    }

    const cartItem = await applyItemQuantity({
      cart,
      variantId: variant.id,
      quantity: finalQuantity,
    });

    const snapshot = await buildCartSnapshot(cart.id);

    if (!snapshot) {
      return corsJson({ error: "Cart not found" }, { status: 404 });
    }

    return corsJson({
      ...snapshot,
      cartItem,
    });
  } catch (error) {
    console.error("[CART_ITEM_POST_ERROR]", error);

    return corsJson({ error: "Failed to add cart item" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { cartToken, cartId, variantId, quantity } = body as {
      cartToken?: string;
      cartId?: string;
      variantId?: string;
      quantity?: number;
    };

    if (!variantId) {
      return corsJson({ error: "variantId is required" }, { status: 400 });
    }

    const cart = await findCart({
      cartId: cartId?.trim(),
      cartToken: cartToken?.trim(),
    });

    if (!cart) {
      return corsJson({ error: "Cart not found" }, { status: 404 });
    }

    const hasValidKey = await maybeValidatePublishableKey(request, cart.storeId);
    if (!hasValidKey) {
      return corsJson({ error: "Invalid publishable key" }, { status: 401 });
    }

    const variant = await getVariantForStore(variantId, cart.storeId);
    if (!variant) {
      return corsJson({ error: "Variant not found" }, { status: 404 });
    }

    const finalQuantity = Math.max(0, Math.floor(quantity ?? 1));
    await applyItemQuantity({
      cart,
      variantId: variant.id,
      quantity: finalQuantity,
    });

    const snapshot = await buildCartSnapshot(cart.id);

    if (!snapshot) {
      return corsJson({ error: "Cart not found" }, { status: 404 });
    }

    return corsJson(snapshot);
  } catch (error) {
    console.error("[CART_ITEM_PATCH_ERROR]", error);

    return corsJson({ error: "Failed to update cart item" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const cartId = url.searchParams.get("cartId")?.trim();
    const cartToken = url.searchParams.get("cartToken")?.trim();
    const variantId = url.searchParams.get("variantId")?.trim();

    if (!variantId) {
      return corsJson({ error: "variantId is required" }, { status: 400 });
    }

    const cart = await findCart({ cartId, cartToken });
    if (!cart) {
      return corsJson({ error: "Cart not found" }, { status: 404 });
    }

    const hasValidKey = await maybeValidatePublishableKey(request, cart.storeId);
    if (!hasValidKey) {
      return corsJson({ error: "Invalid publishable key" }, { status: 401 });
    }

    await prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        variantId,
      },
    });

    const snapshot = await buildCartSnapshot(cart.id);

    if (!snapshot) {
      return corsJson({ error: "Cart not found" }, { status: 404 });
    }

    return corsJson(snapshot);
  } catch (error) {
    console.error("[CART_ITEM_DELETE_ERROR]", error);

    return corsJson({ error: "Failed to remove cart item" }, { status: 500 });
  }
}