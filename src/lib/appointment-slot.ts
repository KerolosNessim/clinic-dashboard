import { prisma } from "@/lib/prisma";
import { findConflictingAppointments } from "@/lib/data/appointments";
import { getDayHours, isTimeWithinHours, formatTime12h } from "@/lib/working-hours";

export function combineDateTime(date: string, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const dt = new Date(date);
  dt.setHours(hours, minutes, 0, 0);
  return dt;
}

/**
 * Validates a slot against the past, the branch's working hours, and the doctor's
 * existing schedule. Shared by appointment create/update, the live client check, and
 * follow-up appointments booked from the "record visit" flow.
 */
export async function validateSlot({
  branchId,
  doctorId,
  dateTime,
  durationMinutes,
  excludeId,
}: {
  branchId: string;
  doctorId: string;
  dateTime: Date;
  durationMinutes: number;
  excludeId?: string;
}): Promise<{ error: string } | null> {
  if (dateTime.getTime() < Date.now()) {
    return { error: "لا يمكن الحجز في تاريخ أو وقت سابق" };
  }

  const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { workingHours: true } });
  if (!branch) return { error: "الفرع غير موجود" };

  const hours = getDayHours(branch.workingHours, dateTime);
  const time = `${String(dateTime.getHours()).padStart(2, "0")}:${String(dateTime.getMinutes()).padStart(2, "0")}`;
  if (hours.closed) {
    return { error: "الفرع مغلق في هذا اليوم" };
  }
  if (!isTimeWithinHours(time, hours.open, hours.close)) {
    return { error: `الفرع متاح من ${formatTime12h(hours.open)} إلى ${formatTime12h(hours.close)} في هذا اليوم` };
  }

  const conflicts = await findConflictingAppointments(doctorId, dateTime, durationMinutes, excludeId);
  if (conflicts.length > 0) {
    return { error: `الطبيب لديه موعد آخر محجوز مع المريض ${conflicts[0].patient.fullName} في هذا الوقت` };
  }

  return null;
}
