"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canAccessBranch, canAccessPatient, isSuperAdmin } from "@/lib/auth-utils";
import { searchPatientsForBooking } from "@/lib/data/appointments";
import { AppointmentStatus, AppointmentType } from "@/generated/prisma/enums";
import { combineDateTime, validateSlot } from "@/lib/appointment-slot";
import { isSameCalendarDay } from "@/lib/date-utils";

const appointmentSchema = z
  .object({
    patientId: z.string().optional(),
    // A walk-in ("كشف عادي") booking creates a minimal Patient record inline instead of
    // requiring the caller to already have a full registered patient to point at.
    walkInName: z.string().optional(),
    walkInPhone: z.string().optional(),
    doctorId: z.string().min(1, "الطبيب مطلوب"),
    branchId: z.string().min(1, "الفرع مطلوب"),
    date: z.string().min(1, "التاريخ مطلوب"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "الوقت مطلوب"),
    durationMinutes: z.coerce.number().int().refine((v) => [30, 45, 60].includes(v), "مدة غير صحيحة"),
    type: z.enum(AppointmentType),
    notes: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.patientId) return;
    if (!values.walkInName || values.walkInName.trim().length < 2) {
      ctx.addIssue({ code: "custom", message: "اسم المريض مطلوب", path: ["walkInName"] });
    }
    if (!values.walkInPhone || !/^01[0125][0-9]{8}$/.test(values.walkInPhone)) {
      ctx.addIssue({ code: "custom", message: "رقم هاتف مصري غير صحيح", path: ["walkInPhone"] });
    }
  });

export async function searchPatients(query: string) {
  const user = await getCurrentUser();
  if (!user) return [];
  return searchPatientsForBooking(query, user.role, user.branches);
}

/** Live availability check used by the booking form before submit — doesn't persist anything. */
export async function checkAppointmentAvailability(values: {
  branchId: string;
  doctorId: string;
  date: string;
  time: string;
  durationMinutes: string | number;
  excludeId?: string;
}) {
  const user = await getCurrentUser();
  if (!user) return { available: false, error: "يجب تسجيل الدخول" };

  if (!values.branchId || !values.doctorId || !values.date || !values.time) {
    return { available: true };
  }

  const dateTime = combineDateTime(values.date, values.time);
  const durationMinutes = Number(values.durationMinutes) || 30;

  const result = await validateSlot({
    branchId: values.branchId,
    doctorId: values.doctorId,
    dateTime,
    durationMinutes,
    excludeId: values.excludeId,
  });

  return result ? { available: false, error: result.error } : { available: true };
}

export async function createAppointment(values: unknown) {
  const user = await getCurrentUser();
  if (!user) return { error: "يجب تسجيل الدخول" };

  const parsed = appointmentSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "بيانات غير صحيحة", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const canAccess = await canAccessBranch(user.id, user.role, parsed.data.branchId);
  if (!canAccess) return { error: "لا تملك صلاحية الحجز في هذا الفرع" };

  if (user.role === "DOCTOR" && parsed.data.doctorId !== user.id) {
    return { error: "لا يمكنك الحجز باسم طبيب آخر" };
  }

  if (parsed.data.patientId) {
    const canAccessThisPatient = await canAccessPatient(user.id, user.role, parsed.data.patientId);
    if (!canAccessThisPatient) return { error: "لا تملك صلاحية الحجز لهذا المريض" };
  }

  const dateTime = combineDateTime(parsed.data.date, parsed.data.time);

  const slotError = await validateSlot({
    branchId: parsed.data.branchId,
    doctorId: parsed.data.doctorId,
    dateTime,
    durationMinutes: parsed.data.durationMinutes,
  });
  if (slotError) return slotError;

  await prisma.$transaction(async (tx) => {
    const patientId =
      parsed.data.patientId ||
      (
        await tx.patient.create({
          data: {
            fullName: parsed.data.walkInName!.trim(),
            phone: parsed.data.walkInPhone!,
            registrationBranchId: parsed.data.branchId,
          },
        })
      ).id;

    await tx.appointment.create({
      data: {
        patientId,
        doctorId: parsed.data.doctorId,
        branchId: parsed.data.branchId,
        dateTime,
        durationMinutes: parsed.data.durationMinutes,
        type: parsed.data.type,
        notes: parsed.data.notes || null,
        createdBy: user.id,
      },
    });
  });

  revalidatePath("/appointments");
  revalidatePath("/");
  return { success: true };
}

export async function updateAppointment(id: string, values: unknown) {
  const user = await getCurrentUser();
  if (!user) return { error: "يجب تسجيل الدخول" };

  const parsed = appointmentSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "بيانات غير صحيحة", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  if (!parsed.data.patientId) return { error: "المريض مطلوب" };

  const existing = await prisma.appointment.findUnique({ where: { id }, select: { status: true } });
  if (!existing) return { error: "الموعد غير موجود" };
  if (existing.status !== "CONFIRMED") {
    return { error: "لا يمكن تعديل موعد تم تسجيل حالته بالفعل" };
  }

  const canAccess = await canAccessBranch(user.id, user.role, parsed.data.branchId);
  if (!canAccess) return { error: "لا تملك صلاحية التعديل في هذا الفرع" };

  if (user.role === "DOCTOR" && parsed.data.doctorId !== user.id) {
    return { error: "لا يمكنك الحجز باسم طبيب آخر" };
  }

  const canAccessThisPatient = await canAccessPatient(user.id, user.role, parsed.data.patientId);
  if (!canAccessThisPatient) return { error: "لا تملك صلاحية الحجز لهذا المريض" };

  const dateTime = combineDateTime(parsed.data.date, parsed.data.time);

  const slotError = await validateSlot({
    branchId: parsed.data.branchId,
    doctorId: parsed.data.doctorId,
    dateTime,
    durationMinutes: parsed.data.durationMinutes,
    excludeId: id,
  });
  if (slotError) return slotError;

  await prisma.appointment.update({
    where: { id },
    data: {
      patientId: parsed.data.patientId,
      doctorId: parsed.data.doctorId,
      branchId: parsed.data.branchId,
      dateTime,
      durationMinutes: parsed.data.durationMinutes,
      type: parsed.data.type,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/appointments");
  revalidatePath(`/appointments/${id}`);
  revalidatePath("/");
  return { success: true };
}

export async function updateAppointmentStatus(id: string, status: AppointmentStatus, reason?: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "يجب تسجيل الدخول" };

  const appointment = await prisma.appointment.findUnique({ where: { id }, include: { visit: { select: { id: true } } } });
  if (!appointment) return { error: "الموعد غير موجود" };

  const canAccess = await canAccessBranch(user.id, user.role, appointment.branchId);
  if (!canAccess) return { error: "لا تملك صلاحية تعديل هذا الموعد" };

  if (appointment.status === status) {
    return { success: true };
  }

  if (appointment.visit && status !== "ATTENDED") {
    return { error: "تم تسجيل زيارة فعلية لهذا الموعد بالفعل — لا يمكن تغيير حالته" };
  }

  if ((status === "ATTENDED" || status === "NO_SHOW") && !isSameCalendarDay(appointment.dateTime, new Date())) {
    return { error: "لا يمكن تسجيل الحضور أو عدم الحضور إلا في نفس يوم الموعد" };
  }

  const reasonLabel = status === "NO_SHOW" ? "سبب عدم الحضور" : null;
  const notes =
    reason && reasonLabel ? `${appointment.notes ?? ""}\n${reasonLabel}: ${reason}`.trim() : appointment.notes;

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({ where: { id }, data: { status, notes } });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "UPDATE_APPOINTMENT_STATUS",
        entityType: "Appointment",
        entityId: id,
        oldValue: { status: appointment.status },
        newValue: { status, reason: reason ?? null },
      },
    });
  });

  revalidatePath("/appointments");
  revalidatePath(`/appointments/${id}`);
  revalidatePath("/");
  return { success: true };
}

export async function cancelAppointment(id: string, reason?: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "يجب تسجيل الدخول" };

  const appointment = await prisma.appointment.findUnique({ where: { id }, include: { visit: { select: { id: true } } } });
  if (!appointment) return { error: "الموعد غير موجود" };

  const canAccess = await canAccessBranch(user.id, user.role, appointment.branchId);
  if (!canAccess && !isSuperAdmin(user.role)) return { error: "لا تملك صلاحية إلغاء هذا الموعد" };

  if (appointment.status === "CANCELLED") {
    return { success: true };
  }

  if (appointment.visit) {
    return { error: "تم تسجيل زيارة فعلية لهذا الموعد — لا يمكن إلغاؤه" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({
      where: { id },
      data: { status: "CANCELLED", notes: reason ? `${appointment.notes ?? ""}\nسبب الإلغاء: ${reason}`.trim() : appointment.notes },
    });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "CANCEL_APPOINTMENT",
        entityType: "Appointment",
        entityId: id,
        oldValue: { status: appointment.status },
        newValue: { status: "CANCELLED", reason: reason ?? null },
      },
    });
  });

  revalidatePath("/appointments");
  revalidatePath(`/appointments/${id}`);
  revalidatePath("/");
  return { success: true };
}
