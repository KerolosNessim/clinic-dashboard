"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, canAccessBranch } from "@/lib/auth-utils";
import { combineDateTime, validateSlot } from "@/lib/appointment-slot";
import { isSameCalendarDay } from "@/lib/date-utils";

const nextAppointmentSchema = z.object({
  branchId: z.string().min(1, "الفرع مطلوب"),
  doctorId: z.string().min(1, "الطبيب مطلوب"),
  date: z.string().min(1, "التاريخ مطلوب"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "الوقت مطلوب"),
});

const visitSchema = z.object({
  diagnosis: z.string().min(1, "التشخيص مطلوب"),
  procedure: z.string().min(1, "الإجراء مطلوب"),
  sessionCost: z.coerce.number().min(0, "السعر غير صحيح"),
  doctorNotes: z.string().optional(),
  nextStep: z.string().optional(),
  nextAppointment: nextAppointmentSchema.optional().nullable(),
});

/**
 * Marks the appointment ATTENDED and creates the linked Visit record — this is the only
 * place a Visit gets created, so a patient's visit history stays tied to real appointments.
 * Optionally books a follow-up appointment in the same step.
 */
export async function recordVisit(appointmentId: string, values: unknown) {
  const user = await getCurrentUser();
  if (!user) return { error: "يجب تسجيل الدخول" };

  const parsed = visitSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "بيانات غير صحيحة", fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const appointment = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appointment) return { error: "الموعد غير موجود" };

  const canAccess = await canAccessBranch(user.id, user.role, appointment.branchId);
  if (!canAccess) return { error: "لا تملك صلاحية تسجيل زيارة لهذا الموعد" };

  if (appointment.status === "CANCELLED") {
    return { error: "لا يمكن تسجيل زيارة لموعد ملغي" };
  }

  if (!isSameCalendarDay(appointment.dateTime, new Date())) {
    return { error: "لا يمكن تسجيل الحضور إلا في نفس يوم الموعد" };
  }

  let nextAppointmentDateTime: Date | null = null;
  if (parsed.data.nextAppointment) {
    const next = parsed.data.nextAppointment;

    const canAccessNext = await canAccessBranch(user.id, user.role, next.branchId);
    if (!canAccessNext) return { error: "لا تملك صلاحية الحجز في فرع موعد المتابعة" };

    if (user.role === "DOCTOR" && next.doctorId !== user.id) {
      return { error: "لا يمكنك حجز موعد المتابعة باسم طبيب آخر" };
    }

    nextAppointmentDateTime = combineDateTime(next.date, next.time);
    const slotError = await validateSlot({
      branchId: next.branchId,
      doctorId: next.doctorId,
      dateTime: nextAppointmentDateTime,
      durationMinutes: 30,
    });
    if (slotError) return slotError;
  }

  try {
  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({ where: { id: appointmentId }, data: { status: "ATTENDED" } });

    const visit = await tx.visit.create({
      data: {
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        branchId: appointment.branchId,
        appointmentId: appointment.id,
        dateTime: appointment.dateTime,
        diagnosis: parsed.data.diagnosis,
        procedure: parsed.data.procedure,
        sessionCost: parsed.data.sessionCost,
        doctorNotes: parsed.data.doctorNotes || null,
        nextStep: parsed.data.nextStep || null,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "RECORD_VISIT",
        entityType: "Visit",
        entityId: visit.id,
        newValue: { appointmentId, diagnosis: visit.diagnosis, procedure: visit.procedure },
      },
    });

    if (parsed.data.nextAppointment && nextAppointmentDateTime) {
      await tx.appointment.create({
        data: {
          patientId: appointment.patientId,
          doctorId: parsed.data.nextAppointment.doctorId,
          branchId: parsed.data.nextAppointment.branchId,
          dateTime: nextAppointmentDateTime,
          durationMinutes: 30,
          type: "FOLLOWUP",
          notes: `متابعة لزيارة بتاريخ ${new Intl.DateTimeFormat("ar-EG").format(appointment.dateTime)}`,
          createdBy: user.id,
        },
      });
    }
  });
  } catch (err) {
    // The Visit.appointmentId @unique constraint is the real guard against a double
    // submit racing this action twice; a pre-check-then-create here couldn't close that
    // window, so we let the DB reject the duplicate and translate its error instead.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "تم تسجيل زيارة لهذا الموعد بالفعل" };
    }
    throw err;
  }

  revalidatePath("/appointments");
  revalidatePath(`/appointments/${appointmentId}`);
  revalidatePath(`/patients/${appointment.patientId}`);
  revalidatePath("/");
  return { success: true };
}
