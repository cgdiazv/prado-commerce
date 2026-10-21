import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserFromRequest } from "@/lib/session";
import {
  getStoreEmailConfig,
  sendCustomerBroadcastEmail,
  BroadcastEmailRecipient,
} from "@/lib/email-notifications";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      storeId,
      recipientFilter = "all", // "all" | "selected" | "group"
      groupId,
      customerIds = [],
      subject,
      preheader,
      message,
      ctaText,
      ctaUrl,
      testEmail,
    } = body;

    if (!storeId || typeof storeId !== "string") {
      return NextResponse.json({ error: "Store ID is required" }, { status: 400 });
    }

    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    // Verify merchant access to this store
    const store = await prisma.store.findFirst({
      where: {
        id: storeId,
        OR: [{ ownerUserId: user.id }, { ownerId: user.id }],
      },
      select: { id: true, name: true, slug: true },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found or unauthorized" }, { status: 404 });
    }

    const emailConfig = await getStoreEmailConfig(storeId);
    if (!emailConfig) {
      return NextResponse.json({ error: "Store email config not found" }, { status: 404 });
    }

    // Resolve recipients
    let recipients: BroadcastEmailRecipient[] = [];

    if (testEmail && typeof testEmail === "string" && testEmail.includes("@")) {
      recipients = [
        {
          email: testEmail.trim().toLowerCase(),
          firstName: user.name || "Admin",
          lastName: null,
        },
      ];
    } else {
      let whereClause: any = { storeId: store.id };

      if (recipientFilter === "selected" && Array.isArray(customerIds) && customerIds.length > 0) {
        whereClause.id = { in: customerIds };
      } else if (recipientFilter === "group" && groupId) {
        if (groupId === "__none__") {
          whereClause.groupId = null;
        } else {
          whereClause.groupId = groupId;
        }
      }

      const foundCustomers = await prisma.customer.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      // Filter and de-duplicate valid emails
      const seenEmails = new Set<string>();
      for (const c of foundCustomers) {
        const cleanEmail = c.email?.trim().toLowerCase();
        if (cleanEmail && cleanEmail.includes("@") && !seenEmails.has(cleanEmail)) {
          seenEmails.add(cleanEmail);
          recipients.push({
            email: cleanEmail,
            firstName: c.firstName,
            lastName: c.lastName,
          });
        }
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No valid email recipients found for the selected criteria." },
        { status: 400 }
      );
    }

    // Send the broadcast
    const result = await sendCustomerBroadcastEmail({
      store: emailConfig,
      recipients,
      subject: subject.trim(),
      preheader: preheader?.trim() || undefined,
      messageHtml: message.trim(),
      ctaText: ctaText?.trim() || undefined,
      ctaUrl: ctaUrl?.trim() || undefined,
    });

    return NextResponse.json({
      success: true,
      totalRecipients: result.total,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      failedEmails: result.failedEmails,
    });
  } catch (error: any) {
    console.error("Error executing customer broadcast:", error);
    return NextResponse.json(
      { error: "Failed to send broadcast emails", details: error?.message },
      { status: 500 }
    );
  }
}
