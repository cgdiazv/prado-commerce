import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resend } from "resend";
import { MerchantNewsletter } from "../emails/merchant-newsletter";
import { prisma } from "../lib/prisma";
import { getOrCreateMerchantAudience } from "../lib/newsletter-sync";

const SENDER = "Prado Commerce <notifications@pradocommerce.com>";
const SUBJECT = "The Inventory Sync Secret (Prado Academy #1)";

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not defined in .env.local");
  }
  return new Resend(apiKey);
}

function renderNewsletterHtml(props?: {
  merchantName?: string;
  storeName?: string;
  issueNumber?: number;
  dashboardUrl?: string;
}): string {
  const element = React.createElement(MerchantNewsletter, {
    dashboardUrl: "https://www.pradocommerce.com",
    ...props,
  });
  return "<!DOCTYPE html>" + renderToStaticMarkup(element);
}

async function sendTestEmail(targetEmail: string) {
  const resend = getResendClient();
  console.log(`📨 Sending test newsletter to: ${targetEmail}...`);

  const html = renderNewsletterHtml({
    merchantName: "Merchant (Test)",
    storeName: "Demo Store",
    issueNumber: 1,
  });

  const response = await resend.emails.send({
    from: SENDER,
    to: targetEmail,
    subject: `[TEST] ${SUBJECT}`,
    html,
  });

  if (response.error) {
    console.error("❌ Failed to send test email:", response.error);
    process.exit(1);
  }

  console.log(`✅ Test email sent successfully! Email ID: ${response.data?.id}`);
}

async function sendPersonalizedToAllMerchants() {
  const resend = getResendClient();
  console.log("🔍 Fetching active merchants from database...");

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
      stores: {
        select: { name: true },
        take: 1,
      },
    },
  });

  if (merchants.length === 0) {
    console.log("No active merchants found to send to.");
    return;
  }

  console.log(`🚀 Sending personalized newsletter to ${merchants.length} merchants...`);

  let sent = 0;
  let failed = 0;

  for (const merchant of merchants) {
    const parts = (merchant.name || "").trim().split(" ");
    const firstName = parts[0] || "Merchant";
    const storeName = merchant.stores[0]?.name || merchant.company || "your store";

    const html = renderNewsletterHtml({
      merchantName: firstName,
      storeName,
      issueNumber: 1,
    });

    try {
      const res = await resend.emails.send({
        from: SENDER,
        to: merchant.email.toLowerCase().trim(),
        subject: SUBJECT,
        html,
      });

      if (res.error) {
        console.warn(`⚠️ Failed to send to ${merchant.email}:`, res.error.message);
        failed++;
      } else {
        console.log(`  ✓ Sent to ${merchant.email} (${res.data?.id})`);
        sent++;
      }
    } catch (err) {
      console.warn(`⚠️ Error sending to ${merchant.email}:`, err);
      failed++;
    }
  }

  console.log("\n📊 Summary:");
  console.log(`- Successfully sent: ${sent}`);
  console.log(`- Failed: ${failed}`);
}

async function createResendBroadcast() {
  const resend = getResendClient();
  const audienceId = await getOrCreateMerchantAudience();
  console.log(`📡 Creating Resend Broadcast for Audience ${audienceId}...`);

  const genericHtml = renderNewsletterHtml({
    merchantName: "Merchant",
    storeName: "your store",
    issueNumber: 1,
  });

  const response = await resend.broadcasts.create({
    audienceId,
    from: SENDER,
    subject: SUBJECT,
    html: genericHtml,
  });

  if (response.error) {
    console.error("❌ Failed to create broadcast:", response.error);
    process.exit(1);
  }

  console.log(`✅ Broadcast draft created in Resend!`);
  console.log(`- Broadcast ID: ${response.data?.id}`);
  console.log(`- Go to https://resend.com/broadcasts to review and send with 1-click!`);
}

async function main() {
  const args = process.argv.slice(2);
  const toArg = args.find((a) => a.startsWith("--to="))?.split("=")[1];
  const isSendAll = args.includes("--send-all");
  const isBroadcast = args.includes("--broadcast");

  if (toArg) {
    await sendTestEmail(toArg);
    return;
  }

  if (isSendAll) {
    await sendPersonalizedToAllMerchants();
    return;
  }

  if (isBroadcast) {
    await createResendBroadcast();
    return;
  }

  console.log(`
Prado Commerce - Newsletter Dispatcher
-------------------------------------
Usage options:

1. Send a test email to your own inbox:
   npm run send:newsletter -- --to=your-email@example.com

2. Send personalized emails to all active merchants directly:
   npm run send:newsletter -- --send-all

3. Create a Broadcast in your Resend Dashboard:
   npm run send:newsletter -- --broadcast
`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
