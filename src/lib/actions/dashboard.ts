import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfWeek(date: Date) {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

async function appointmentScopeWhere(userId: string, role: Role, branchIds: string[]) {
  if (role === "SUPER_ADMIN") return {};
  if (role === "DOCTOR") return { doctorId: userId };
  return { branchId: { in: branchIds } };
}

export async function getTodayStats(userId: string, role: Role, branchIds: string[]) {
  const now = new Date();
  const todayWhere = await appointmentScopeWhere(userId, role, branchIds);

  const [todayAppointments, pendingApprovals, newPatientsThisWeek, monthlyRevenue] =
    await Promise.all([
      prisma.appointment.count({
        where: { ...todayWhere, dateTime: { gte: startOfDay(now), lte: endOfDay(now) } },
      }),
      role === "SUPER_ADMIN"
        ? prisma.approvalRequest.count({ where: { status: "PENDING" } })
        : Promise.resolve(0),
      prisma.patient.count({
        where: { createdAt: { gte: startOfWeek(now) } },
      }),
      role === "SUPER_ADMIN"
        ? prisma.payment.aggregate({
            _sum: { amount: true },
            where: { createdAt: { gte: startOfMonth(now) } },
          })
        : Promise.resolve({ _sum: { amount: null } }),
    ]);

  return {
    todayAppointments,
    pendingApprovals,
    newPatientsThisWeek,
    monthlyRevenue: Number(monthlyRevenue._sum.amount ?? 0),
  };
}

export async function getTodayAppointments(userId: string, role: Role, branchIds: string[]) {
  const now = new Date();
  const where = await appointmentScopeWhere(userId, role, branchIds);

  return prisma.appointment.findMany({
    where: { ...where, dateTime: { gte: startOfDay(now), lte: endOfDay(now) } },
    orderBy: { dateTime: "asc" },
    include: {
      patient: { select: { id: true, fullName: true } },
      doctor: { select: { id: true, name: true, doctorProfile: { select: { specialty: true } } } },
    },
  });
}

export async function getAppointmentsTrend(userId: string, role: Role, branchIds: string[]) {
  const where = await appointmentScopeWhere(userId, role, branchIds);
  const formatter = new Intl.DateTimeFormat("ar-EG", { weekday: "short" });
  const days = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000));

  // One indexed count() per day (on [doctorId|branchId, dateTime] / [status, dateTime])
  // instead of fetching every row in the range and filtering it in JS.
  const counts = await Promise.all(
    days.map((day) =>
      prisma.appointment.count({
        where: { ...where, dateTime: { gte: startOfDay(day), lte: endOfDay(day) } },
      })
    )
  );

  return days.map((day, i) => ({ label: formatter.format(day), count: counts[i] }));
}

export async function getAppointmentStatusBreakdown(userId: string, role: Role, branchIds: string[]) {
  const where = await appointmentScopeWhere(userId, role, branchIds);
  const rangeStart = startOfDay(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000));
  const rangeEnd = endOfDay(new Date());

  const grouped = await prisma.appointment.groupBy({
    by: ["status"],
    where: { ...where, dateTime: { gte: rangeStart, lte: rangeEnd } },
    _count: true,
  });

  return grouped.map((g) => ({ status: g.status, count: g._count }));
}
