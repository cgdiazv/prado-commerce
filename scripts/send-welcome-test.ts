import { prisma } from "../lib/prisma";
import {
  getStoreEmailConfig,
  sendWelcomeEmail,
  sendMerchantSubscriptionWelcomeEmail,
} from "../lib/email-notifications";

async function main() {
  const args = process.argv.slice(2);
  const toArg = args.find((a) => a.startsWith("--to="))?.split("=")[1] || "cgdiazv@gmail.com";
  const typeArg = args.find((a) => a.startsWith("--type="))?.split("=")[1] || "both";
  const storeArg = args.find((a) => a.startsWith("--store="))?.split("=")[1];

  console.log("--------------------------------------------------");
  console.log(" Prado Commerce - Welcome Email Dispatcher & Tester");
  console.log("--------------------------------------------------");
  console.log(`🎯 Target Email: ${toArg}`);
  console.log(`📦 Type:         ${typeArg}`);

  // Find store config
  let store = null;
  if (storeArg) {
    store = await prisma.store.findFirst({
      where: {
        OR: [{ id: storeArg }, { slug: storeArg }, { name: { contains: storeArg, mode: "insensitive" } }],
      },
    });
  } else {
    // Default to Indeva Websites if available, or first store with welcome email enabled
    store = await prisma.store.findFirst({
      where: { slug: "indeva-websites" },
    });
    if (!store) {
      store = await prisma.store.findFirst();
    }
  }

  if (!store) {
    console.error("❌ No store found in database.");
    process.exit(1);
  }

  const storeConfig = await getStoreEmailConfig(store.id);
  if (!storeConfig) {
    console.error(`❌ Could not load email configuration for store: ${store.name}`);
    process.exit(1);
  }

  // Find customer name if exists in database
  const customer = await prisma.customer.findFirst({
    where: {
      email: { equals: toArg, mode: "insensitive" },
    },
    select: { firstName: true, lastName: true },
  });

  const customerName = customer?.firstName || "Carlos";

  // 1. Send Store Welcome Email
  if (typeArg === "store" || typeArg === "both") {
    console.log(`\n📨 [1/2] Sending Store Customer Welcome Email for '${store.name}'...`);
    try {
      const result = await sendWelcomeEmail({
        store: storeConfig,
        to: toArg,
        firstName: customerName,
      });

      console.log(`✅ Store Customer Welcome Email successfully sent to ${toArg}!`);
      if (result && "data" in result && result.data?.id) {
        console.log(`   Email ID: ${result.data.id}`);
      }
    } catch (err: any) {
      console.error(`❌ Failed to send store welcome email:`, err?.message || err);
    }
  }

  // 2. Send Merchant Welcome Email
  if (typeArg === "merchant" || typeArg === "both") {
    console.log(`\n📨 [2/2] Sending Merchant Account Welcome Email (Prado Commerce)...`);
    try {
      // Find merchant user
      const merchant = await prisma.merchantUser.findFirst({
        where: {
          OR: [
            { email: { equals: toArg, mode: "insensitive" } },
            { email: { contains: "cgdiazv", mode: "insensitive" } },
          ],
        },
        select: { name: true, plan: true },
      });

      const merchantName = merchant?.name || customerName || "Carlos Diaz del Valle";
      const plan = (merchant?.plan as "STARTER" | "PRO" | "ENTERPRISE") || "ENTERPRISE";

      const result = await sendMerchantSubscriptionWelcomeEmail({
        email: toArg,
        name: merchantName,
        plan,
      });

      console.log(`✅ Merchant Welcome Email (${plan} plan) successfully sent to ${toArg}!`);
      if (result && "data" in result && result.data?.id) {
        console.log(`   Email ID: ${result.data.id}`);
      }
    } catch (err: any) {
      console.error(`❌ Failed to send merchant welcome email:`, err?.message || err);
    }
  }

  console.log("\n✨ Done! Check your inbox at " + toArg);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
