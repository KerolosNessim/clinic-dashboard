"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canAccessPatient } from "@/lib/auth-utils";
import { ToothCondition } from "@/generated/prisma/enums";
import { isValidFdiToothNumber } from "@/lib/dental-chart";

const updateSchema = z.object({
  condition: z.enum(ToothCondition),
  notes: z.string().optional(),
});

export async function updateToothRecord(patientId: string, toothNumber: number, values: unknown) {
  const user = await getCurrentUser();
  if (!user) return { error: "يجب تسجيل الدخول" };

  const hasAccess = await canAccessPatient(user.id, user.role, patientId);
  if (!hasAccess) return { error: "لا تملك صلاحية تعديل مخطط الأسنان لهذا المريض" };

  if (!isValidFdiToothNumber(toothNumber)) {
    return { error: "رقم سن غير صحيح" };
  }

  const parsed = updateSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "بيانات غير صحيحة" };
  }

  const previous = await prisma.toothRecord.findUnique({
    where: { patientId_toothNumber: { patientId, toothNumber } },
  });

  await prisma.$transaction(async (tx) => {
    const record = await tx.toothRecord.upsert({
      where: { patientId_toothNumber: { patientId, toothNumber } },
      create: {
        patientId,
        toothNumber,
        condition: parsed.data.condition,
        notes: parsed.data.notes || null,
        updatedBy: user.id,
      },
      update: {
        condition: parsed.data.condition,
        notes: parsed.data.notes || null,
        updatedBy: user.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_TOOTH_RECORD",
        entityType: "ToothRecord",
        entityId: record.id,
        oldValue: previous ? { condition: previous.condition, notes: previous.notes } : undefined,
        newValue: { condition: record.condition, notes: record.notes },
      },
    });
  });

  revalidatePath(`/patients/${patientId}`);
  return { success: true };
}
