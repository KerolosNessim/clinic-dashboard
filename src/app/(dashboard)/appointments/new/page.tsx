import { getCurrentUser } from "@/lib/auth-utils";
import { getAppointmentFilterOptions } from "@/lib/data/appointments";
import { AppointmentForm } from "@/components/appointments/appointment-form";

export default async function NewAppointmentPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const filterOptions = await getAppointmentFilterOptions(user.role, user.branches);

  return (
    <div className="mx-auto w-full max-w-200 space-y-4 px-6 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-foreground">حجز موعد جديد</h1>
      <div className="rounded-xl border border-border bg-white p-6">
        <AppointmentForm
          branches={filterOptions.branches}
          doctors={filterOptions.doctors}
          fixedDoctorId={user.role === "DOCTOR" ? user.id : undefined}
          defaultBranchId={user.branches[0] ?? filterOptions.branches[0]?.id ?? ""}
        />
      </div>
    </div>
  );
}
