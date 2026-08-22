import { db } from "../src/lib/db";

async function main() {
  const result = await db.employee.updateMany({
    where: { emailVerifiedAt: null },
    data: { emailVerifiedAt: new Date() },
  });

  console.log(`\n✅ Successfully marked emails as VERIFIED for ${result.count} employee(s) in your database!\n`);
}

main()
  .catch((err) => {
    console.error("Error verifying emails:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
