import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getShopperSessionCookieValueFromRequest } from "@/lib/shopper-auth";
import { calculateTax } from "@/lib/tax";

export async function POST(request: Request) {
  try {
    const shopperSession = getShopperSessionCookieValueFromRequest(request);
    if (!shopperSession?.storeId || !shopperSession.customerId) {
      return NextResponse.json({ error: "Please sign in to checkout" }, { status: 401 });
    }

    const body = await request.json();
    const cartId = typeof body.cartId === "string" ? body.cartId.trim() : "";
    if (!cartId) return NextResponse.json({ error: "cartId is required" }, { status: 400 });

    const cart = await prisma.cart.findFirst({
      where: {
        id: cartId,
        storeId: shopperSession.storeId,
        OR: [{ customerId: shopperSession.customerId }, { customerId: null }],
      },
      select: {
        store: { select: { taxSettings: true } },
        items: {
          select: {
            quantity: true,
            variant: {
              select: {
                price: true,
                product: { select: { taxable: true, taxCategoryCode: true } },
              },
            },
          },
        },
      },
    });

    if (!cart) return NextResponse.json({ error: "Cart not found" }, { status: 404 });

    const taxCustomer = await prisma.customer.findFirst({
      where: { id: shopperSession.customerId, storeId: shopperSession.storeId },
      select: { taxExempt: true },
    });
    const address = body.shippingAddress && typeof body.shippingAddress === "object"
      ? body.shippingAddress as { country?: unknown; state?: unknown }
      : {};
    const shipping = Number.isFinite(Number(body.shippingAmount))
      ? Math.max(0, Number(body.shippingAmount))
      : 0;
    const calculatedTax = calculateTax(
      cart.store?.taxSettings,
      { country: address.country, region: address.state },
      cart.items.map((item) => ({
        price: Number(item.variant.price),
        quantity: item.quantity,
        taxable: item.variant.product.taxable,
        taxCategoryCode: item.variant.product.taxCategoryCode,
      })),
      shipping,
      taxCustomer?.taxExempt ?? false,
    );

    return NextResponse.json({
      tax: calculatedTax.total,
      includedTax: calculatedTax.includedTax,
      taxToAdd: calculatedTax.additionalTax,
      pricesIncludeTax: calculatedTax.pricesIncludeTax,
    });
  } catch (error) {
    console.error("[STOREFRONT_TAX_ESTIMATE_ERROR]", error);
    return NextResponse.json({ error: "Unable to estimate tax" }, { status: 500 });
  }
}
