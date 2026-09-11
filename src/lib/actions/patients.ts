"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canAccessBranch, canAccessPatient } from "@/lib/auth-utils";

// birthDate/gender/nationalId are nullable in the DB for a walk-in ("كشف عادي") patient
// created straight from booking — keep them optional here too, otherwise a walk-in can never
// be edited through this form without being forced to supply data that was never collected.
const patientSchema = z.object({
  fullName: z.string().min(2, "الاسم مطلوب"),
  birthDate: z.string().optional(),
  gender: z.enum(["ذكر", "أنثى"]).optional(),
  phone: z.string().regex(/^01[0125][0-9]{8}$/, "رقم هاتف مصري غير صحيح"),
  nationalId: z.string().regex(/^\d{14}$/, "الرقم القومي يجب أن يكون 14 رقم").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  job: z.string().optional(),
  maritalStatus: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().regex(/^01[0125][0-9]{8}$/, "رقم هاتف مصري غير صحيح").optional().or(z.literal("")),
  referralSource: z.string().optional(),
  registrationBranchId: z.string().min(1, "الفرع مطلوب"),
});

export async function createPatient(values: unknown) {
  const user = await getCurrentUser();
  if (!user) return { error: "يجب تسجيل الدخول" };

  const parsed = patientSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "بيانات غير صحيحة", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const canAccess = await canAccessBranch(user.id, user.role, parsed.data.registrationBranchId);
  if (!canAccess) return { error: "لا تملك صلاحية إضافة مريض في هذا الفرع" };

  await prisma.patient.create({
    data: {
      ...parsed.data,
      nationalId: parsed.data.nationalId || null,
      emergencyPhone: parsed.data.emergencyPhone || null,
      birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : null,
    },
  });

  revalidatePath("/patients");
  return { success: true };
}

export async function updatePatient(id: string, values: unknown) {
  const user = await getCurrentUser();
  if (!user) return { error: "يجب تسجيل الدخول" };

  const existing = await prisma.patient.findUnique({ where: { id }, select: { registrationBranchId: true } });
  if (!existing) return { error: "المريض غير موجود" };

  const hasAccess = await canAccessPatient(user.id, user.role, id);
  if (!hasAccess) return { error: "لا تملك صلاحية تعديل بيانات هذا المريض" };

  const parsed = patientSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "بيانات غير صحيحة", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  if (parsed.data.registrationBranchId !== existing.registrationBranchId) {
    const canMoveTo = await canAccessBranch(user.id, user.role, parsed.data.registrationBranchId);
    if (!canMoveTo) return { error: "لا تملك صلاحية نقل المريض لهذا الفرع" };
  }

  await prisma.patient.update({
    where: { id },
    data: {
      ...parsed.data,
      nationalId: parsed.data.nationalId || null,
      emergencyPhone: parsed.data.emergencyPhone || null,
      birthDate: parsed.data.birthDate ? new Date(parsed.data.birthDate) : null,
    },
  });

  revalidatePath("/patients");
  revalidatePath(`/patients/${id}`);
  return { success: true };
}

/** Deletes a patient and every record that references them (visits, appointments,
 * invoices/payments/refunds, treatment plans/sessions, tooth records, medical history).
 * Restricted to SUPER_ADMIN — this is enforced here, not just hidden in the UI. */
export async function deletePatient(id: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") {
    return { error: "الحذف النهائي متاح لمدير النظام فقط" };
  }

  const patient = await prisma.patient.findUnique({
    where: { id },
    select: { fullName: true, phone: true, nationalId: true },
  });
  if (!patient) {
    return { error: "المريض غير موجود" };
  }

  await prisma.$transaction(async (tx) => {
    const invoices = await tx.invoice.findMany({ where: { patientId: id }, select: { id: true } });
    const invoiceIds = invoices.map((i) => i.id);

    await tx.refund.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
    await tx.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
    await tx.invoice.deleteMany({ where: { id: { in: invoiceIds } } });

    const plans = await tx.treatmentPlan.findMany({ where: { patientId: id }, select: { id: true } });
    const planIds = plans.map((p) => p.id);
    await tx.treatmentSession.deleteMany({ where: { planId: { in: planIds } } });

    await tx.visit.deleteMany({ where: { patientId: id } });
    await tx.treatmentPlan.deleteMany({ where: { id: { in: planIds } } });
    await tx.appointment.deleteMany({ where: { patientId: id } });
    await tx.toothRecord.deleteMany({ where: { patientId: id } });
    await tx.medicalHistory.deleteMany({ where: { patientId: id } });

    await tx.patient.delete({ where: { id } });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "DELETE_PATIENT_CASCADE",
        entityType: "Patient",
        entityId: id,
        oldValue: patient,
      },
    });
  });

  revalidatePath("/patients");
  return { success: true };
}
