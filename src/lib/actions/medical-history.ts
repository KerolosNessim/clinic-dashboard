"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canAccessPatient } from "@/lib/auth-utils";

const medicalHistorySchema = z.object({
  allergies: z.array(z.string()).default([]),
  chronicDiseases: z.array(z.string()).default([]),
  isPregnant: z.boolean().nullable().default(null),
  currentMedications: z.string().optional(),
});

export async function upsertMedicalHistory(patientId: string, values: unknown) {
  const user = await getCurrentUser();
  if (!user) return { error: "يجب تسجيل الدخول" };

  const hasAccess = await canAccessPatient(user.id, user.role, patientId);
  if (!hasAccess) return { error: "لا تملك صلاحية تعديل الملف الطبي لهذا المريض" };

  const parsed = medicalHistorySchema.safeParse(values);
  if (!parsed.success) {
    return { error: "بيانات غير صحيحة", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await prisma.medicalHistory.upsert({
    where: { patientId },
    create: { patientId, ...parsed.data },
    update: parsed.data,
  });

  revalidatePath(`/patients/${patientId}`);
  return { success: true };
}
