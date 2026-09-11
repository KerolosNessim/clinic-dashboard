import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { getAppointmentById, getAppointmentFilterOptions } from "@/lib/data/appointments";
import { AppointmentForm } from "@/components/appointments/appointment-form";

export default async function EditAppointmentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  const [appointment, filterOptions] = await Promise.all([
    getAppointmentById(id, user.id, user.role, user.branches),
    getAppointmentFilterOptions(user.role, user.branches),
  ]);
  if (!appointment) notFound();

  return (
    <div className="mx-auto w-full max-w-200 space-y-4 px-6 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-foreground">تعديل الموعد</h1>
      <div className="rounded-xl border border-border bg-white p-6">
        <AppointmentForm
          branches={filterOptions.branches}
          doctors={filterOptions.doctors}
          fixedDoctorId={user.role === "DOCTOR" ? user.id : undefined}
          defaultBranchId={appointment.branchId}
          appointment={{
            id: appointment.id,
            patientId: appointment.patientId,
            patientName: appointment.patient.fullName,
            doctorId: appointment.doctorId,
            branchId: appointment.branchId,
            dateTime: appointment.dateTime,
            durationMinutes: appointment.durationMinutes,
            type: appointment.type,
            notes: appointment.notes,
          }}
        />
      </div>
    </div>
  );
}
