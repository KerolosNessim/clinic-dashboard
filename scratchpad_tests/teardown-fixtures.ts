import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
async function main() {
  const user = await prisma.user.findUnique({ where: { phone: "01090009000" } });
  if (user) {
    await prisma.userBranch.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
    console.log("Deleted test STAFF user", user.id);
  } else {
    console.log("No test STAFF user to delete");
  }
}
main().finally(() => prisma.$disconnect());
