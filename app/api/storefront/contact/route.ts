import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendStoreContactMessageEmail } from "@/lib/email-notifications";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 120;
const MAX_EMAIL_LENGTH = 254;
const MAX_PHONE_LENGTH = 40;
const MAX_MESSAGE_LENGTH = 5000;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const storeId = String(body?.storeId ?? "").trim();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const phone = String(body?.phone ?? "").trim();
    const message = String(body?.message ?? "").trim();

    // Hidden honeypot field: real buyers never fill it in, so pretend success for bots.
    if (String(body?.website ?? "").trim()) {
      return NextResponse.json({ ok: true });
    }

    if (!storeId) {
      return NextResponse.json({ error: "storeId is required" }, { status: 400 });
    }

    if (!name || !message) {
      return NextResponse.json({ error: "Name and message are required" }, { status: 400 });
    }

    if (!EMAIL_PATTERN.test(email) || email.length > MAX_EMAIL_LENGTH) {
      return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
    }

    if (name.length > MAX_NAME_LENGTH || phone.length > MAX_PHONE_LENGTH || message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "One of the fields is too long" }, { status: 400 });
    }

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        name: true,
        senderEmail: true,
        replyToEmail: true,
        ownerUser: { select: { email: true } },
      },
    });

    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const recipient = store.senderEmail?.trim() || store.replyToEmail?.trim() || store.ownerUser?.email?.trim();

    if (!recipient) {
      return NextResponse.json({ error: "This store cannot receive messages right now." }, { status: 422 });
    }

    const result = await sendStoreContactMessageEmail({
      storeName: store.name,
      to: recipient,
      buyerName: name,
      buyerEmail: email,
      buyerPhone: phone || null,
      message,
    });

    if ("error" in result && result.error) {
      console.error("[STORE_CONTACT_EMAIL_ERROR]", result.error);
      return NextResponse.json({ error: "Could not send your message. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[STORE_CONTACT_ERROR]", error);
    return NextResponse.json({ error: "Could not send your message. Please try again." }, { status: 500 });
  }
}
