import { prisma } from "@/lib/prisma";

export async function getToothRecords(patientId: string) {
  return prisma.toothRecord.findMany({ where: { patientId } });
}
