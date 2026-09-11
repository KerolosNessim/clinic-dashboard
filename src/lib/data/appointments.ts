import { prisma } from "@/lib/prisma";
import { Role, Prisma } from "@/generated/prisma/client";

export const APPOINTMENTS_PAGE_SIZE = 10;

export type AppointmentFilters = {
  search?: string;
  branchId?: string;
  doctorId?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
};

export function appointmentScopeWhere(
  userId: string,
  role: Role,
  branchIds: string[]
): Prisma.AppointmentWhereInput {
  if (role === "SUPER_ADMIN") return {};
  if (role === "DOCTOR") return { doctorId: userId };
  return { branchId: { in: branchIds } };
}

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

export async function getAppointments(
  filters: AppointmentFilters,
  userId: string,
  role: Role,
  branchIds: string[]
) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;

  const filterWhere: Prisma.AppointmentWhereInput = {
    ...(filters.search
      ? {
          patient: {
            OR: [
              { fullName: { contains: filters.search, mode: "insensitive" } },
              { phone: { contains: filters.search } },
            ],
          },
        }
      : {}),
    ...(filters.branchId ? { branchId: filters.branchId } : {}),
    ...(filters.doctorId ? { doctorId: filters.doctorId } : {}),
    ...(filters.status ? { status: filters.status as Prisma.EnumAppointmentStatusFilter["equals"] } : {}),
    ...(filters.from || filters.to
      ? {
          dateTime: {
            ...(filters.from ? { gte: startOfDay(new Date(filters.from)) } : {}),
            ...(filters.to ? { lte: endOfDay(new Date(filters.to)) } : {}),
          },
        }
      : {}),
  };

  const where: Prisma.AppointmentWhereInput = {
    AND: [appointmentScopeWhere(userId, role, branchIds), filterWhere],
  };

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, fullName: true, phone: true } },
        doctor: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { dateTime: "desc" },
      skip: (page - 1) * APPOINTMENTS_PAGE_SIZE,
      take: APPOINTMENTS_PAGE_SIZE,
    }),
    prisma.appointment.count({ where }),
  ]);

  return { appointments, total, page, pageSize: APPOINTMENTS_PAGE_SIZE };
}

export async function getWeeklyAppointments(
  weekStart: Date,
  userId: string,
  role: Role,
  branchIds: string[]
) {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const where: Prisma.AppointmentWhereInput = {
    AND: [
      appointmentScopeWhere(userId, role, branchIds),
      { dateTime: { gte: weekStart, lt: weekEnd } },
    ],
  };

  return prisma.appointment.findMany({
    where,
    include: {
      patient: { select: { id: true, fullName: true, phone: true } },
      doctor: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
    orderBy: { dateTime: "asc" },
  });
}

export async function getAppointmentById(id: string, userId: string, role: Role, branchIds: string[]) {
  return prisma.appointment.findFirst({
    where: { AND: [{ id }, appointmentScopeWhere(userId, role, branchIds)] },
    include: {
      patient: { select: { id: true, fullName: true, phone: true } },
      doctor: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
      createdByUser: { select: { id: true, name: true } },
    },
  });
}

export async function getAppointmentFilterOptions(role: Role, branchIds: string[]) {
  const branchWhere: Prisma.BranchWhereInput = role === "SUPER_ADMIN" ? {} : { id: { in: branchIds } };

  const [branches, doctors] = await Promise.all([
    prisma.branch.findMany({
      where: branchWhere,
      select: { id: true, name: true, workingHours: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: {
        role: "DOCTOR",
        ...(role === "SUPER_ADMIN" ? {} : { branches: { some: { branchId: { in: branchIds } } } }),
      },
      select: { id: true, name: true, branches: { select: { branchId: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    branches,
    doctors: doctors.map((d) => ({ id: d.id, name: d.name, branchIds: d.branches.map((b) => b.branchId) })),
  };
}

export async function searchPatientsForBooking(query: string, role: Role, branchIds: string[]) {
  if (!query || query.trim().length < 2) return [];

  const scopeWhere: Prisma.PatientWhereInput =
    role === "SUPER_ADMIN"
      ? {}
      : {
          OR: [
            { registrationBranchId: { in: branchIds } },
            { visits: { some: { branchId: { in: branchIds } } } },
            { appointments: { some: { branchId: { in: branchIds } } } },
          ],
        };

  return prisma.patient.findMany({
    where: {
      AND: [
        scopeWhere,
        {
          OR: [
            { fullName: { contains: query, mode: "insensitive" } },
            { phone: { contains: query } },
          ],
        },
      ],
    },
    select: {
      id: true,
      fullName: true,
      phone: true,
      gender: true,
      birthDate: true,
      registrationBranch: { select: { name: true } },
    },
    take: 8,
    orderBy: { fullName: "asc" },
  });
}

/** Finds appointments for the same doctor whose time window overlaps the requested slot. */
export async function findConflictingAppointments(
  doctorId: string,
  dateTime: Date,
  durationMinutes: number,
  excludeId?: string
) {
  const windowStart = new Date(dateTime.getTime() - 4 * 60 * 60 * 1000);
  const windowEnd = new Date(dateTime.getTime() + 4 * 60 * 60 * 1000);
  const newEnd = new Date(dateTime.getTime() + durationMinutes * 60 * 1000);

  const candidates = await prisma.appointment.findMany({
    where: {
      doctorId,
      status: { not: "CANCELLED" },
      dateTime: { gte: windowStart, lte: windowEnd },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, dateTime: true, durationMinutes: true, patient: { select: { fullName: true } } },
  });

  return candidates.filter((a) => {
    const existingEnd = new Date(a.dateTime.getTime() + a.durationMinutes * 60 * 1000);
    return a.dateTime < newEnd && dateTime < existingEnd;
  });
}
