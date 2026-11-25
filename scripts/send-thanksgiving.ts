import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Resend } from "resend";
import { MerchantThanksgivingEmail } from "../emails/merchant-thanksgiving";
import { prisma } from "../lib/prisma";

const SENDER = "Prado Commerce <notifications@pradocommerce.com>";
const REPLY_TO = "support@pradocommerce.com";
const SUBJECT = "Happy Thanksgiving from Prado Commerce 🍂";

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not defined in .env.local");
  }
  return new Resend(apiKey);
}

function renderThanksgivingHtml(props?: {
  merchantName?: string;
  storeName?: string;
}): string {
  const element = React.createElement(MerchantThanksgivingEmail, {
    dashboardUrl: "https://www.pradocommerce.com/dashboard",
    settingsUrl: "https://www.pradocommerce.com/dashboard/settings",
    ...props,
  });
  return "<!DOCTYPE html>" + renderToStaticMarkup(element);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAllTenants() {
  const merchants = await prisma.merchantUser.findMany({
    where: {
      email: { not: "" },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      company: true,
      subscriptionStatus: true,
      stores: {
        orderBy: { createdAt: "desc" },
        select: { name: true },
        take: 1,
      },
    },
  });

  const seen = new Set<string>();
  return merchants.filter((merchant) => {
    const normalized = merchant.email.toLowerCase().trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

async function sendTestEmail(targetEmail: string) {
  const resend = getResendClient();
  console.log(`📨 Sending test Thanksgiving email to: ${targetEmail}...`);

  const html = renderThanksgivingHtml({
    merchantName: "Carlos",
    storeName: "Demo Store",
  });

  const response = await resend.emails.send({
    from: SENDER,
    replyTo: REPLY_TO,
    to: targetEmail.trim(),
    subject: `[TEST] ${SUBJECT}`,
    html,
  });

  if (response.error) {
    console.error("❌ Failed to send test email:", response.error);
    process.exit(1);
  }

  console.log(`✅ Test email sent successfully! Email ID: ${response.data?.id}`);
}

async function dryRun() {
  const tenants = await fetchAllTenants();
  console.log(`🔍 Dry run — found ${tenants.length} tenant(s):`);
  for (const tenant of tenants) {
    const firstName = (tenant.name || "").trim().split(/\s+/)[0] || "Partner";
    const storeName = tenant.stores[0]?.name || tenant.company || "(no store name)";
    const html = renderThanksgivingHtml({
      merchantName: firstName,
      storeName: tenant.stores[0]?.name || tenant.company || undefined,
    });
    console.log(
      `  • ${tenant.email} | greeting="Dear ${firstName}," | store="${storeName}" | status=${tenant.subscriptionStatus} | html=${html.length} bytes`,
    );
  }
}

async function sendToAllTenants() {
  const resend = getResendClient();
  console.log("🔍 Fetching all tenants from database...");

  const tenants = await fetchAllTenants();

  if (tenants.length === 0) {
    console.log("No tenants found to send to.");
    return;
  }

  console.log(`🍂 Sending Happy Thanksgiving email to ${tenants.length} tenant(s)...`);

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < tenants.length; i++) {
    const tenant = tenants[i];
    const firstName = (tenant.name || "").trim().split(/\s+/)[0] || undefined;
    const storeName = tenant.stores[0]?.name || tenant.company || undefined;
    const to = tenant.email.toLowerCase().trim();

    const html = renderThanksgivingHtml({
      merchantName: firstName,
      storeName,
    });

    try {
      const res = await resend.emails.send({
        from: SENDER,
        replyTo: REPLY_TO,
        to,
        subject: SUBJECT,
        html,
      });

      if (res.error) {
        console.warn(`⚠️ Failed to send to ${to}:`, res.error.message);
        failed++;
      } else {
        console.log(`  ✓ Sent to ${to} (${res.data?.id})`);
        sent++;
      }
    } catch (err) {
      console.warn(`⚠️ Error sending to ${to}:`, err);
      failed++;
    }

    if (i < tenants.length - 1) {
      await sleep(600);
    }
  }

  console.log("\n📊 Summary:");
  console.log(`- Successfully sent: ${sent}`);
  console.log(`- Failed: ${failed}`);
}

async function main() {
  const args = process.argv.slice(2);
  const toArg = args.find((a) => a.startsWith("--to="))?.split("=")[1];
  const isDryRun = args.includes("--dry-run");
  const isSendAll = args.includes("--send-all");

  if (isDryRun) {
    await dryRun();
    return;
  }

  if (toArg) {
    await sendTestEmail(toArg);
    return;
  }

  if (isSendAll) {
    await sendToAllTenants();
    return;
  }

  console.log(`
Prado Commerce - Thanksgiving Email Dispatcher
----------------------------------------------
Usage options:

1. Preview recipients and verify HTML rendering without sending:
   npm run send:thanksgiving -- --dry-run

2. Send a test email to your own inbox:
   npm run send:thanksgiving -- --to=your-email@example.com

3. Send personalized Thanksgiving emails to all tenants:
   npm run send:thanksgiving -- --send-all
`);
}

main()
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
