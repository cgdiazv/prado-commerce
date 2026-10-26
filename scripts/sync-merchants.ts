import { syncMerchantsToResendAudience } from "../lib/newsletter-sync";

async function main() {
  console.log("Starting merchant sync with Resend Audience...");
  try {
    const result = await syncMerchantsToResendAudience();
    console.log("✅ Sync complete!");
    console.log(`- Audience ID: ${result.audienceId}`);
    console.log(`- Total active merchants found: ${result.stats.totalFound}`);
    console.log(`- Added/updated in Resend: ${result.stats.addedOrUpdated}`);
    console.log(`- Errors: ${result.stats.errors}`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Sync failed:", err);
    process.exit(1);
  }
}

main();
