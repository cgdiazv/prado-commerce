import { NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/session";
import { sendSupportTicketEmail } from "@/lib/email-notifications";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUserFromRequest(req);
    const body = await req.json();

    const { subject, category, priority, message, email, name } = body as {
      subject?: string;
      category?: string;
      priority?: string;
      message?: string;
      email?: string;
      name?: string;
    };

    if (!subject?.trim()) {
      return NextResponse.json({ error: "Ticket subject is required." }, { status: 400 });
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: "Ticket message description is required." }, { status: 400 });
    }

    const ticketEmail = email?.trim() || user?.email || "";
    if (!ticketEmail) {
      return NextResponse.json({ error: "Contact email is required." }, { status: 400 });
    }

    const ticketName = name?.trim() || user?.name || user?.email || "Merchant User";
    const ticketUserId = user?.id || null;

    await sendSupportTicketEmail({
      userEmail: ticketEmail,
      userName: ticketName,
      userId: ticketUserId,
      subject: subject.trim(),
      category: category?.trim() || "General Support",
      priority: priority?.trim() || "NORMAL",
      message: message.trim(),
    });

    return NextResponse.json({
      ok: true,
      message: "Helpdesk ticket submitted successfully. Support will respond shortly.",
    });
  } catch (error) {
    console.error("[SUPPORT_TICKET_API_ERROR]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to submit helpdesk ticket." },
      { status: 500 },
    );
  }
}
