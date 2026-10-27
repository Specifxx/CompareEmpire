/**
 * Daily price-alert dispatcher. Walks every PriceAlert, emails subscribers
 * whose trigger condition holds (target hit, or a >=5% week-on-week drop for
 * target-less watches) and re-arms alerts whose condition stopped holding.
 *
 * Run right AFTER the catalog/price import so it compares fresh prices.
 *
 * Usage: npx tsx scripts/run-alerts.ts   (needs DATABASE_URL + RESEND_API_KEY)
 */
import { runPriceAlerts } from "../src/lib/price-alerts";
import { isEmailEnabled } from "../src/lib/email";
import { prisma } from "../src/lib/db";

async function main() {
  console.log("── TCGPriceEmpire price alerts ─────────────────────────────");
  if (!isEmailEnabled()) {
    // Still run: re-arms keep working, and the summary shows what WOULD send.
    console.warn("  RESEND_API_KEY not set — alert emails will NOT be delivered.");
  }
  const summary = await runPriceAlerts();
  console.log(`  checked:     ${summary.checked} alert rows`);
  console.log(`  emails sent: ${summary.emailsSent}`);
  console.log(`  re-armed:    ${summary.rearmed}`);
  console.log("─────────────────────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("run-alerts crashed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
