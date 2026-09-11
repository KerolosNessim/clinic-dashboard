import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { canAccessPatient, canAccessBranch } from "../src/lib/auth-utils";
import { computeInvoiceStatus } from "../src/lib/data/invoices";
import { isValidFdiToothNumber } from "../src/lib/dental-chart";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type Result = { name: string; pass: boolean; detail?: string };
const results: Result[] = [];

function check(name: string, pass: boolean, detail?: string) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "✅ PASS" : "❌ FAIL"} — ${name}${detail ? `  (${detail})` : ""}`);
}

async function main() {
  // ── Fixtures: reuse seed data, create a couple of throwaway records for edge cases ──
  const maadi = await prisma.branch.findFirstOrThrow({ where: { name: "فرع المعادي" } });
  const nasrCity = await prisma.branch.findFirstOrThrow({ where: { name: "فرع مدينة نصر" } });
  const mohamed = await prisma.user.findFirstOrThrow({ where: { phone: "01033333333" } }); // STAFF @ maadi
  const sara = await prisma.user.findFirstOrThrow({ where: { phone: "01044444444" } }); // STAFF @ nasr city
  const admin = await prisma.user.findFirstOrThrow({ where: { phone: "01000000000" } }); // SUPER_ADMIN

  // p4 "هدى محمد الشناوي" — registered at maadi, no nasr-city visits/appointments in seed data.
  const patientMaadi = await prisma.patient.findFirstOrThrow({ where: { phone: "01055501004" } });
  // p3 "يوسف كريم عبد الله" — registered at nasr city, and seed only ever gives him a nasr-city
  // visit — must NOT overlap with maadi, unlike p2 who has a seeded maadi follow-up appointment.
  const patientNasr = await prisma.patient.findFirstOrThrow({ where: { phone: "01055501003" } });

  console.log("\n=== 1. canAccessPatient ===");
  check(
    "SUPER_ADMIN can access any patient",
    await canAccessPatient(admin.id, "SUPER_ADMIN", patientNasr.id) === true
  );
  check(
    "STAFF (maadi) can access a patient registered at maadi",
    await canAccessPatient(mohamed.id, "STAFF", patientMaadi.id) === true
  );
  check(
    "STAFF (maadi) CANNOT access a patient registered at nasr city with no maadi visits [IDOR fix]",
    await canAccessPatient(mohamed.id, "STAFF", patientNasr.id) === false
  );
  check(
    "STAFF (nasr city) can access a patient registered at nasr city",
    await canAccessPatient(sara.id, "STAFF", patientNasr.id) === true
  );

  // Cross-branch access via a Visit (not just registrationBranchId) must also grant access.
  const crossPatient = await prisma.patient.create({
    data: { fullName: "TEST — cross-branch visit patient", phone: "01099999999", registrationBranchId: nasrCity.id },
  });
  await prisma.visit.create({
    data: {
      patientId: crossPatient.id,
      doctorId: admin.id,
      branchId: maadi.id,
      dateTime: new Date(),
      diagnosis: "test",
      procedure: "test",
      sessionCost: 0,
    },
  });
  check(
    "STAFF (maadi) can access a patient registered elsewhere but with a visit at maadi",
    await canAccessPatient(mohamed.id, "STAFF", crossPatient.id) === true
  );
  await prisma.visit.deleteMany({ where: { patientId: crossPatient.id } });
  await prisma.patient.delete({ where: { id: crossPatient.id } });

  console.log("\n=== 2. canAccessBranch ===");
  check("STAFF (maadi) can access maadi branch", await canAccessBranch(mohamed.id, "STAFF", maadi.id) === true);
  check(
    "STAFF (maadi) CANNOT access nasr city branch",
    await canAccessBranch(mohamed.id, "STAFF", nasrCity.id) === false
  );
  check("SUPER_ADMIN can access any branch", await canAccessBranch(admin.id, "SUPER_ADMIN", nasrCity.id) === true);

  console.log("\n=== 3. computeInvoiceStatus ===");
  const now = new Date();
  const old = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
  check("total paid in full -> PAID", computeInvoiceStatus(1000, 1000, now) === "PAID");
  check("overpaid -> still PAID (not a crash/negative status)", computeInvoiceStatus(1000, 1200, now) === "PAID");
  check("partially paid, recent invoice -> PARTIAL", computeInvoiceStatus(1000, 400, now) === "PARTIAL");
  check("partially paid, >30 days old -> OVERDUE", computeInvoiceStatus(1000, 400, old) === "OVERDUE");

  console.log("\n=== 4. FDI tooth number validation ===");
  check("11 (valid, upper right central incisor) is valid", isValidFdiToothNumber(11) === true);
  check("48 (valid, lower right last molar) is valid", isValidFdiToothNumber(48) === true);
  check("18 (valid) is valid", isValidFdiToothNumber(18) === true);
  check("99 (invalid quadrant) is rejected", isValidFdiToothNumber(99) === false);
  check("0 (invalid) is rejected", isValidFdiToothNumber(0) === false);
  check("19 (invalid position, quadrant 1 has only 1-8) is rejected", isValidFdiToothNumber(19) === false);
  check("50 (invalid quadrant, only 1-4 exist) is rejected", isValidFdiToothNumber(50) === false);

  console.log("\n=== 5. ApprovalRequest single-use (EDIT_PAYMENT) consumption ===");
  // Simulate the exact query updatePayment() runs, without going through the Server Action
  // (which requires a real HTTP request for next-auth's session).
  const patientForInvoice = patientMaadi;
  const invoice = await prisma.invoice.create({
    data: {
      patientId: patientForInvoice.id,
      branchId: maadi.id,
      items: [{ name: "test item", price: 100, quantity: 1 }],
      subtotal: 100,
      discount: 0,
      total: 100,
      status: "PARTIAL",
      isLocked: true,
      sequenceNumber: `TEST-${Date.now()}`,
    },
  });
  const payment = await prisma.payment.create({
    data: { invoiceId: invoice.id, method: "CASH", amount: 50, recordedBy: admin.id },
  });
  const approval = await prisma.approvalRequest.create({
    data: {
      type: "EDIT_PAYMENT",
      entityType: "Payment",
      entityId: payment.id,
      requestedBy: mohamed.id,
      reason: "test",
      status: "APPROVED",
      resolvedBy: admin.id,
      resolvedAt: new Date(),
    },
  });

  const findUnconsumed = () =>
    prisma.approvalRequest.findFirst({
      where: { type: "EDIT_PAYMENT", entityId: payment.id, status: "APPROVED", consumedAt: null },
    });

  check("An approved, unconsumed EDIT_PAYMENT request IS found for its own payment", (await findUnconsumed()) !== null);

  const otherPayment = await prisma.payment.create({
    data: { invoiceId: invoice.id, method: "CASH", amount: 20, recordedBy: admin.id },
  });
  const findForOtherPayment = () =>
    prisma.approvalRequest.findFirst({
      where: { type: "EDIT_PAYMENT", entityId: otherPayment.id, status: "APPROVED", consumedAt: null },
    });
  check(
    "The SAME approval is NOT matched for a different payment on the same invoice [critical fix]",
    (await findForOtherPayment()) === null
  );

  await prisma.approvalRequest.update({ where: { id: approval.id }, data: { consumedAt: new Date() } });
  check("After being consumed, the approval is no longer found as reusable [single-use fix]", (await findUnconsumed()) === null);

  // cleanup
  await prisma.approvalRequest.delete({ where: { id: approval.id } });
  await prisma.payment.deleteMany({ where: { invoiceId: invoice.id } });
  await prisma.invoice.delete({ where: { id: invoice.id } });

  console.log("\n=== 6. Invoice sequenceNumber uniqueness (DB-level guard the retry logic relies on) ===");
  const dupeSeq = `TEST-DUPE-${Date.now()}`;
  const inv1 = await prisma.invoice.create({
    data: {
      patientId: patientForInvoice.id,
      branchId: maadi.id,
      items: [{ name: "x", price: 1, quantity: 1 }],
      subtotal: 1,
      discount: 0,
      total: 1,
      sequenceNumber: dupeSeq,
    },
  });
  let dupeRejected = false;
  try {
    await prisma.invoice.create({
      data: {
        patientId: patientForInvoice.id,
        branchId: maadi.id,
        items: [{ name: "x", price: 1, quantity: 1 }],
        subtotal: 1,
        discount: 0,
        total: 1,
        sequenceNumber: dupeSeq,
      },
    });
  } catch (err) {
    dupeRejected = (err as { code?: string }).code === "P2002";
  }
  check("A second invoice with the same sequenceNumber is rejected by the DB (P2002)", dupeRejected);
  await prisma.invoice.delete({ where: { id: inv1.id } });

  console.log("\n=== 7. User phone uniqueness (DB-level guard the createUser/updateUser retry relies on) ===");
  const dupePhone = "01098765432";
  const u1 = await prisma.user.create({ data: { name: "TEST A", phone: dupePhone, password: "x", role: "STAFF" } });
  let phoneDupeRejected = false;
  try {
    await prisma.user.create({ data: { name: "TEST B", phone: dupePhone, password: "x", role: "STAFF" } });
  } catch (err) {
    phoneDupeRejected = (err as { code?: string }).code === "P2002";
  }
  check("A second user with the same phone is rejected by the DB (P2002)", phoneDupeRejected);
  await prisma.user.delete({ where: { id: u1.id } });

  console.log("\n=== 8. Index coverage (pg_indexes catalog) ===");
  // The dev DB has only a handful of rows, so the planner correctly prefers a sequential
  // scan over an index scan regardless of which indexes exist — EXPLAIN can't tell us
  // anything meaningful here. Check the catalog directly for the indexes added instead.
  const indexRows = await prisma.$queryRawUnsafe<{ indexname: string; indexdef: string }[]>(
    `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public'`
  );
  const expectedIndexes = [
    ["Appointment", ["doctorId", "dateTime"]],
    ["Appointment", ["branchId", "dateTime"]],
    ["Visit", ["patientId", "dateTime"]],
    ["Invoice", ["patientId"]],
    ["Payment", ["invoiceId"]],
    ["Patient", ["registrationBranchId"]],
    ["ApprovalRequest", ["entityType", "entityId"]],
  ] as const;
  for (const [table, cols] of expectedIndexes) {
    const found = indexRows.some(
      (r) => r.indexdef.includes(`"${table}"`) && cols.every((c) => r.indexdef.includes(`"${c}"`))
    );
    check(`Index exists covering ${table}(${cols.join(", ")})`, found);
  }

  // ── Summary ──
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${"=".repeat(50)}`);
  console.log(`TOTAL: ${results.length}   PASSED: ${results.length - failed.length}   FAILED: ${failed.length}`);
  if (failed.length > 0) {
    console.log("Failed cases:", failed.map((f) => f.name).join("; "));
  }
}

main()
  .catch((e) => {
    console.error("FATAL:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
