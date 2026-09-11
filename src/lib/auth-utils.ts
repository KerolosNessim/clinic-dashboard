import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export function isSuperAdmin(role: Role) {
  return role === "SUPER_ADMIN";
}

export function isDoctor(role: Role) {
  return role === "DOCTOR";
}

export async function canAccessBranch(userId: string, role: Role, branchId: string) {
  if (isSuperAdmin(role)) return true;

  const membership = await prisma.userBranch.findUnique({
    where: { userId_branchId: { userId, branchId } },
  });
  return !!membership;
}

export async function canStaffAccessPatient(staffId: string, patientId: string) {
  const staffBranches = await prisma.userBranch.findMany({
    where: { userId: staffId },
    select: { branchId: true },
  });
  const branchIds = staffBranches.map((b) => b.branchId);
  if (branchIds.length === 0) return false;

  const visit = await prisma.visit.findFirst({
    where: { patientId, branchId: { in: branchIds } },
  });
  return !!visit;
}

/**
 * Authoritative patient-access check for every action that reads/writes a specific patient
 * (profile, medical history, dental chart). SUPER_ADMIN always passes; DOCTOR/STAFF must be
 * scoped to a branch the patient is registered at, has visited, or has an appointment at —
 * matching `patientScopeWhere` in lib/data/patients.ts so list and mutation access agree.
 */
export async function canAccessPatient(userId: string, role: Role, patientId: string) {
  if (isSuperAdmin(role)) return true;

  const branches = await prisma.userBranch.findMany({ where: { userId }, select: { branchId: true } });
  const branchIds = branches.map((b) => b.branchId);
  if (branchIds.length === 0) return false;

  const patient = await prisma.patient.findFirst({
    where: {
      id: patientId,
      OR: [
        { registrationBranchId: { in: branchIds } },
        { visits: { some: { branchId: { in: branchIds } } } },
        { appointments: { some: { branchId: { in: branchIds } } } },
      ],
    },
    select: { id: true },
  });
  return !!patient;
}
