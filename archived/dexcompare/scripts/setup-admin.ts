// Provision the "compareempire" admin / verified-seller account. The password is
// stored ONLY as a bcrypt hash (irreversible) — never in plaintext in the repo.
// Override via env if rotating: ADMIN_USERNAME, ADMIN_PASSWORD_HASH.
//   DATABASE_URL=... npx tsx scripts/setup-admin.ts
import { prisma } from "../src/lib/db";

const EMAIL = (process.env.ADMIN_USERNAME || "compareempire").toLowerCase();
// bcrypt hash of the chosen admin password.
const HASH = process.env.ADMIN_PASSWORD_HASH || "$2a$10$O5fONAak2jY/zGCVkbhp/.sIxGuqmGfYU0DxNgOpf8sTC64qQFxum";

async function main() {
  const u = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { passwordHash: HASH, isAdmin: true, verifiedSeller: true, displayName: "CompareEmpire", sellerName: "CompareEmpire Marketplace", emailVerified: new Date() },
    create: { email: EMAIL, passwordHash: HASH, displayName: "CompareEmpire", sellerName: "CompareEmpire Marketplace", isAdmin: true, verifiedSeller: true, emailVerified: new Date() },
  });
  console.log(`Ready: ${u.email} (id ${u.id}) — admin=${u.isAdmin} verifiedSeller=${u.verifiedSeller}`);
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
