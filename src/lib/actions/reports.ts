import { prisma } from "@/lib/prisma";

export type ReportRange = { from: Date; to: Date };

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const REFERRAL_LABEL_FALLBACK = "غير محدد";

export async function getFinancialReport(range: ReportRange) {
  const where = { createdAt: { gte: range.from, lte: endOfDay(range.to) } };

  const [revenueAgg, expensesAgg, earningsAgg, patients] = await Promise.all([
    prisma.payment.aggregate({ _sum: { amount: true }, where }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { date: where.createdAt } }),
    prisma.earningRecord.aggregate({ _sum: { totalAmount: true }, where }),
    prisma.patient.findMany({ where, select: { referralSource: true } }),
  ]);

  const totalRevenue = Number(revenueAgg._sum.amount ?? 0);
  const totalExpenses = Number(expensesAgg._sum.amount ?? 0);
  const totalEarnings = Number(earningsAgg._sum.totalAmount ?? 0);

  // Trailing 12 calendar months, independent of the selected range — matches the
  // "شهري 12 شهر" chart in the original spec, which is always a fixed lookback.
  const twelveMonthsAgo = startOfMonth(new Date(range.to.getFullYear(), range.to.getMonth() - 11, 1));
  const monthlyPayments = await prisma.payment.findMany({
    where: { createdAt: { gte: twelveMonthsAgo } },
    select: { amount: true, createdAt: true },
  });

  const monthlyRevenue = Array.from({ length: 12 }, (_, i) => {
    const month = new Date(range.to.getFullYear(), range.to.getMonth() - 11 + i, 1);
    const key = monthKey(month);
    const total = monthlyPayments
      .filter((p) => monthKey(p.createdAt) === key)
      .reduce((sum, p) => sum + Number(p.amount), 0);
    return { label: new Intl.DateTimeFormat("ar-EG", { month: "short" }).format(month), total };
  });

  const referralCounts = new Map<string, number>();
  for (const p of patients) {
    const key = p.referralSource?.trim() || REFERRAL_LABEL_FALLBACK;
    referralCounts.set(key, (referralCounts.get(key) ?? 0) + 1);
  }
  const referralBreakdown = Array.from(referralCounts, ([source, count]) => ({ source, count }));

  return {
    totalRevenue,
    totalExpenses,
    totalEarnings,
    netProfit: totalRevenue - totalExpenses - totalEarnings,
    monthlyRevenue,
    referralBreakdown,
  };
}

export async function getBranchComparison(range: ReportRange) {
  const dateWhere = { gte: range.from, lte: endOfDay(range.to) };

  const branches = await prisma.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });

  return Promise.all(
    branches.map(async (branch) => {
      const [revenueAgg, expensesAgg, appointmentsCount, newPatientsCount] = await Promise.all([
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: { createdAt: dateWhere, invoice: { branchId: branch.id } },
        }),
        prisma.expense.aggregate({ _sum: { amount: true }, where: { branchId: branch.id, date: dateWhere } }),
        prisma.appointment.count({ where: { branchId: branch.id, dateTime: dateWhere } }),
        prisma.patient.count({ where: { registrationBranchId: branch.id, createdAt: dateWhere } }),
      ]);

      const revenue = Number(revenueAgg._sum.amount ?? 0);
      const expenses = Number(expensesAgg._sum.amount ?? 0);

      return {
        branchId: branch.id,
        branchName: branch.name,
        revenue,
        expenses,
        netProfit: revenue - expenses,
        appointmentsCount,
        newPatientsCount,
      };
    })
  );
}

export async function getOperationalReport(range: ReportRange) {
  const dateWhere = { gte: range.from, lte: endOfDay(range.to) };
  const rangeDays = (range.to.getTime() - range.from.getTime()) / 86_400_000;
  const byDay = rangeDays <= 31;

  const [patients, attendanceGrouped, procedureGrouped, followUps] = await Promise.all([
    prisma.patient.findMany({ where: { createdAt: dateWhere }, select: { createdAt: true } }),
    prisma.appointment.groupBy({ by: ["status"], where: { dateTime: dateWhere }, _count: true }),
    prisma.visit.groupBy({
      by: ["procedure"],
      where: { dateTime: dateWhere },
      _count: { procedure: true },
      orderBy: { _count: { procedure: "desc" } },
      take: 8,
    }),
    prisma.visit.findMany({
      where: { recallDate: { lte: endOfDay(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)) } },
      orderBy: { recallDate: "asc" },
      take: 20,
      include: {
        patient: { select: { id: true, fullName: true, phone: true } },
        doctor: { select: { name: true } },
      },
    }),
  ]);

  let newPatientsTrend: { label: string; count: number }[];
  if (byDay) {
    const days = Math.max(1, Math.round(rangeDays) + 1);
    const formatter = new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short" });
    newPatientsTrend = Array.from({ length: days }, (_, i) => {
      const day = new Date(range.from);
      day.setDate(day.getDate() + i);
      const dayKey = day.toDateString();
      const count = patients.filter((p) => p.createdAt.toDateString() === dayKey).length;
      return { label: formatter.format(day), count };
    });
  } else {
    const months = new Map<string, { label: string; count: number }>();
    for (const p of patients) {
      const key = monthKey(p.createdAt);
      const existing = months.get(key);
      if (existing) existing.count += 1;
      else months.set(key, { label: new Intl.DateTimeFormat("ar-EG", { month: "short", year: "2-digit" }).format(p.createdAt), count: 1 });
    }
    newPatientsTrend = Array.from(months.values());
  }

  return {
    newPatientsTrend,
    attendanceBreakdown: attendanceGrouped.map((g) => ({ status: g.status, count: g._count })),
    topProcedures: procedureGrouped.map((g) => ({ procedure: g.procedure, count: g._count.procedure })),
    upcomingFollowUps: followUps
      .filter((v) => v.recallDate)
      .map((v) => ({
        visitId: v.id,
        patientId: v.patient.id,
        patientName: v.patient.fullName,
        patientPhone: v.patient.phone,
        doctorName: v.doctor.name,
        recallDate: v.recallDate as Date,
      })),
  };
}
