import { prisma } from "@/lib/prisma";

export async function getBranches() {
  return prisma.branch.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getBranchDetail(id: string) {
  const branch = await prisma.branch.findUnique({
    where: { id },
    include: {
      users: { include: { user: { select: { id: true, name: true, role: true } } } },
    },
  });
  if (!branch) return null;

  const [appointments, visits, patientCount] = await Promise.all([
    prisma.appointment.findMany({
      where: { branchId: id },
      orderBy: { dateTime: "desc" },
      take: 10,
      include: { patient: { select: { fullName: true } }, doctor: { select: { name: true } } },
    }),
    prisma.visit.findMany({
      where: { branchId: id },
      orderBy: { dateTime: "desc" },
      take: 10,
      include: { patient: { select: { fullName: true } }, doctor: { select: { name: true } } },
    }),
    prisma.patient.count({ where: { registrationBranchId: id } }),
  ]);

  return { branch, appointments, visits, patientCount };
}
