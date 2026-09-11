import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const branch = await prisma.branch.findFirst({ where: { isActive: true } });
  if (!branch) throw new Error("No active branch found to attach the test STAFF user to");

  const phone = "01090009000";
  const hashed = await bcrypt.hash("TestStaff123", 10);
  await prisma.user.deleteMany({ where: { phone } });
  const user = await prisma.user.create({
    data: { name: "TEST — E2E STAFF", phone, password: hashed, role: "STAFF" },
  });
  await prisma.userBranch.create({ data: { userId: user.id, branchId: branch.id } });
  console.log(JSON.stringify({ userId: user.id, phone, password: "TestStaff123", branchId: branch.id }));
}
main().finally(() => prisma.$disconnect());
