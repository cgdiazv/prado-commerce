import { prisma } from "@/lib/prisma";
import { corsJson, withCorsHeaders } from "@/lib/api-cors";
import { getPlanLimits, getPlanOrDefault } from "@/lib/subscription";
import { buildCheckoutUrl } from "@/lib/checkout-url";

export async function OPTIONS() {
  return withCorsHeaders(new Response(null, { status: 204 }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { cartId } = body as { cartId?: string };

    if (!cartId?.trim()) {
      return corsJson({ error: "cartId is required" }, { status: 400 });
    }

    const cart = await prisma.cart.findUnique({
      where: { id: cartId.trim() },
      select: {
        id: true,
        token: true,
        store: {
          select: {
            ownerUser: {
              select: {
                plan: true,
              },
            },
          },
        },
        items: {
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!cart) {
      return corsJson({ error: "Cart not found" }, { status: 404 });
    }

    if (cart.items.length === 0) {
      return corsJson({ error: "Cart is empty" }, { status: 400 });
    }

    const requestUrl = new URL(request.url);
    const checkoutUrl = buildCheckoutUrl(requestUrl.origin, cart.token);
    const ownerPlan = getPlanOrDefault(cart.store.ownerUser?.plan);
    const limits = getPlanLimits(ownerPlan);

    return corsJson({
      checkoutUrl,
      plan: ownerPlan,
      platformFeeRate: limits.platformFeeRate,
    });
  } catch (error) {
    console.error("[CHECKOUT_CREATE_ERROR]", error);

    return corsJson({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
