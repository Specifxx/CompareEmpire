// Near-real-time restock check for the featured products. Re-polls only those
// products' store listings, logs restock events, then fires "it's back" emails.
// Run on a ~15-minute schedule (see .github/workflows/restock-check-dexcompare.yml)
// so alerts land inside the minutes-long window before a hyped set sells out again.
//
// Needs DATABASE_URL; RESEND_API_KEY (+ EMAIL_FROM) for the emails to actually send.
import { recheckFeaturedRestocks } from "../src/lib/restock-recheck";
import { runRestockAlerts } from "../src/lib/restock-alerts";
import { prisma } from "../src/lib/db";

async function main() {
  const recheck = await recheckFeaturedRestocks();
  console.log(`Recheck: ${recheck.checked} listings polled, ${recheck.flippedInStock} restocked, ${recheck.flippedOutOfStock} sold out.`);
  const alerts = await runRestockAlerts();
  console.log(`Alerts: ${alerts.emailsSent} emails sent across ${alerts.products} products (${alerts.rearmed} re-armed).`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("restock-check failed:", e);
  await prisma.$disconnect();
  process.exit(1);
});
