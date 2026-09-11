import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

export async function getUsers(role?: Role) {
  return prisma.user.findMany({
    where: role ? { role } : undefined,
    include: {
      branches: { include: { branch: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getBranchOptions() {
  return prisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getDoctorDetail(id: string) {
  const doctor = await prisma.user.findFirst({
    where: { id, role: "DOCTOR" },
    include: {
      branches: { include: { branch: { select: { id: true, name: true } } } },
    },
  });
  if (!doctor) return null;

  const [visits, appointments] = await Promise.all([
    prisma.visit.findMany({
      where: { doctorId: id },
      orderBy: { dateTime: "desc" },
      take: 10,
      include: { patient: { select: { fullName: true } }, branch: { select: { name: true } } },
    }),
    prisma.appointment.findMany({
      where: { doctorId: id },
      orderBy: { dateTime: "desc" },
      take: 10,
      include: { patient: { select: { fullName: true } }, branch: { select: { name: true } } },
    }),
  ]);

  return { doctor, visits, appointments };
}

export async function getAssistantDetail(id: string) {
  const assistant = await prisma.user.findFirst({
    where: { id, role: "STAFF" },
    include: {
      branches: { include: { branch: { select: { id: true, name: true } } } },
    },
  });
  if (!assistant) return null;

  const [createdAppointments, expenses] = await Promise.all([
    prisma.appointment.findMany({
      where: { createdBy: id },
      orderBy: { dateTime: "desc" },
      take: 10,
      include: { patient: { select: { fullName: true } }, branch: { select: { name: true } } },
    }),
    prisma.expense.findMany({
      where: { recordedBy: id },
      orderBy: { date: "desc" },
      take: 10,
      include: { branch: { select: { name: true } } },
    }),
  ]);

  return { assistant, createdAppointments, expenses };
}
