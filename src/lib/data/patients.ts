import { prisma } from "@/lib/prisma";
import { Role, Prisma } from "@/generated/prisma/client";

export const PATIENTS_PAGE_SIZE = 15;

export type PatientFilters = {
  search?: string;
  branchId?: string;
  doctorId?: string;
  page?: number;
};

export function patientScopeWhere(role: Role, branchIds: string[]): Prisma.PatientWhereInput {
  if (role === "SUPER_ADMIN") return {};
  return {
    OR: [
      { registrationBranchId: { in: branchIds } },
      { visits: { some: { branchId: { in: branchIds } } } },
      { appointments: { some: { branchId: { in: branchIds } } } },
    ],
  };
}

export async function getPatients(filters: PatientFilters, role: Role, branchIds: string[]) {
  const page = filters.page && filters.page > 0 ? filters.page : 1;

  const filterWhere: Prisma.PatientWhereInput = {
    ...(filters.search
      ? {
          OR: [
            { fullName: { contains: filters.search, mode: "insensitive" } },
            { phone: { contains: filters.search } },
          ],
        }
      : {}),
    ...(filters.branchId ? { registrationBranchId: filters.branchId } : {}),
    ...(filters.doctorId
      ? { visits: { some: { doctorId: filters.doctorId } } }
      : {}),
  };

  const where: Prisma.PatientWhereInput = {
    AND: [patientScopeWhere(role, branchIds), filterWhere],
  };

  const [patients, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      include: {
        registrationBranch: { select: { name: true } },
        visits: {
          orderBy: { dateTime: "desc" },
          take: 1,
          select: { dateTime: true, doctor: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PATIENTS_PAGE_SIZE,
      take: PATIENTS_PAGE_SIZE,
    }),
    prisma.patient.count({ where }),
  ]);

  return { patients, total, page, pageSize: PATIENTS_PAGE_SIZE };
}

export async function getPatientFilterOptions(role: Role, branchIds: string[]) {
  const branchWhere: Prisma.BranchWhereInput =
    role === "SUPER_ADMIN" ? {} : { id: { in: branchIds } };

  const [branches, doctors] = await Promise.all([
    prisma.branch.findMany({ where: branchWhere, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: {
        role: "DOCTOR",
        ...(role === "SUPER_ADMIN" ? {} : { branches: { some: { branchId: { in: branchIds } } } }),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { branches, doctors };
}

export async function getPatientById(id: string, role: Role, branchIds: string[]) {
  return prisma.patient.findFirst({
    where: { AND: [{ id }, patientScopeWhere(role, branchIds)] },
    include: {
      registrationBranch: { select: { name: true } },
      medicalHistory: true,
      visits: {
        orderBy: { dateTime: "desc" },
        include: { doctor: { select: { name: true } }, branch: { select: { name: true } } },
      },
      appointments: {
        where: { status: "CONFIRMED", visit: null },
        orderBy: { dateTime: "asc" },
        include: { doctor: { select: { name: true } }, branch: { select: { name: true } } },
      },
    },
  });
}
