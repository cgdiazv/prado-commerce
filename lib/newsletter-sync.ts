import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const AUDIENCE_NAME = "Prado Merchants";

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Resend(apiKey);
}

/**
 * Ensures the target Resend Audience exists, creating it if necessary.
 */
export async function getOrCreateMerchantAudience(): Promise<string> {
  const resend = getResendClient();
  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured in environment variables.");
  }

  const audiencesResponse = await resend.audiences.list();
  const audiences = audiencesResponse.data?.data || [];

  const existing = audiences.find((a) => a.name.toLowerCase() === AUDIENCE_NAME.toLowerCase());
  if (existing) {
    return existing.id;
  }

  const created = await resend.audiences.create({ name: AUDIENCE_NAME });
  if (!created.data?.id) {
    throw new Error(`Failed to create audience "${AUDIENCE_NAME}": ${JSON.stringify(created.error)}`);
  }

  return created.data.id;
}

/**
 * Adds or updates an individual merchant in the Resend Audience immediately.
 * Safe to call in signup flows (non-blocking, won't throw if Resend is unavailable).
 */
export async function addMerchantToResend(merchant: {
  email: string;
  name?: string | null;
}) {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.warn("[RESEND_AUDIENCE] Skipping contact sync: RESEND_API_KEY is not configured.");
      return;
    }

    const audienceId = await getOrCreateMerchantAudience();
    const parts = (merchant.name || "").trim().split(" ");
    const firstName = parts[0] || undefined;
    const lastName = parts.slice(1).join(" ") || undefined;

    await resend.contacts.create({
      audienceId,
      email: merchant.email.toLowerCase().trim(),
      firstName,
      lastName,
      unsubscribed: false,
    });
  } catch (err: unknown) {
    console.warn(`[RESEND_CONTACT_CREATE_ERROR] Failed to add ${merchant.email} to audience:`, err);
  }
}

/**
 * Syncs all active merchants from Supabase (via Prisma) to the Resend Audience.
 */
export async function syncMerchantsToResendAudience() {
  const resend = getResendClient();
  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured in environment variables.");
  }

  const audienceId = await getOrCreateMerchantAudience();

  // 1. Fetch active merchants with their associated stores
  const merchants = await prisma.merchantUser.findMany({
    where: {
      subscriptionStatus: "active",
      email: { not: "" },
    },
    select: {
      id: true,
      email: true,
      name: true,
      company: true,
      plan: true,
      stores: {
        select: {
          name: true,
          slug: true,
        },
        take: 1,
      },
    },
  });

  const stats = {
    totalFound: merchants.length,
    addedOrUpdated: 0,
    errors: 0,
  };

  // 2. Upsert contacts to Resend Audience
  for (const merchant of merchants) {
    try {
      const parts = (merchant.name || "").trim().split(" ");
      const firstName = parts[0] || undefined;
      const lastName = parts.slice(1).join(" ") || undefined;

      await resend.contacts.create({
        audienceId,
        email: merchant.email.toLowerCase().trim(),
        firstName,
        lastName,
        unsubscribed: false,
      });

      stats.addedOrUpdated++;
    } catch (err: unknown) {
      console.warn(`[NEWSLETTER_SYNC_ERROR] Contact ${merchant.email}:`, err);
      stats.errors++;
    }
  }

  return {
    audienceId,
    stats,
  };
}
