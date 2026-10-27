import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";
import {
  getStoreEmailConfig,
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendInvoiceEmail,
} from "@/lib/email-notifications";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: storeId } = await params;
    if (!storeId) {
      return NextResponse.json({ error: "Store ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const testEmail = String(body?.testEmail || "").trim().toLowerCase();
    const templateType = String(body?.templateType || "welcome").trim().toLowerCase();

    if (!testEmail || !EMAIL_REGEX.test(testEmail)) {
      return NextResponse.json(
        { error: "A valid test recipient email address is required" },
        { status: 400 }
      );
    }

    // Verify merchant access to this store
    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
        OR: [{ ownerUserId: user.id }, { ownerId: user.id }],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        currency: true,
      },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found or unauthorized" }, { status: 404 });
    }

    const emailConfig = await getStoreEmailConfig(store.id);
    if (!emailConfig) {
      return NextResponse.json({ error: "Store email config could not be loaded" }, { status: 500 });
    }

    const firstName = user.name?.trim().split(" ")[0] || "Valued Customer";
    const currency = store.currency || "USD";

    let result: any;

    if (templateType === "order_confirmation") {
      result = await sendOrderConfirmationEmail({
        store: emailConfig,
        to: testEmail,
        firstName,
        orderNumber: 1024,
        total: 89.50,
        currency,
      });
    } else if (templateType === "invoice") {
      result = await sendInvoiceEmail({
        store: emailConfig,
        to: testEmail,
        firstName,
        orderNumber: 1024,
        total: 89.50,
        currency,
      });
    } else {
      // "welcome" or default
      result = await sendWelcomeEmail({
        store: emailConfig,
        to: testEmail,
        firstName,
      });
    }

    return NextResponse.json({
      success: true,
      templateType,
      recipient: testEmail,
      messageId: result?.data?.id || null,
    });
  } catch (error: any) {
    console.error("[EMAIL_TEST_POST_ERROR]", error);
    return NextResponse.json(
      { error: error?.message || "Failed to send test email" },
      { status: 500 }
    );
  }
}
