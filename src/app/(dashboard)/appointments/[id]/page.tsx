import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil, Calendar, User, Stethoscope, Building2, Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-utils";
import { getAppointmentById, getAppointmentFilterOptions } from "@/lib/data/appointments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AppointmentStatusActions } from "@/components/appointments/appointment-status-actions";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/generated/prisma/client";

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  CONFIRMED: "مؤكد",
  ATTENDED: "حضر",
  NO_SHOW: "لم يحضر",
  CANCELLED: "ملغي",
};

const STATUS_CLASS: Record<AppointmentStatus, string> = {
  CONFIRMED: "bg-sky-100 text-sky-700",
  ATTENDED: "bg-emerald-100 text-emerald-800",
  NO_SHOW: "bg-amber-100 text-amber-800",
  CANCELLED: "bg-slate-100 text-slate-600",
};

const TYPE_LABEL: Record<string, string> = {
  CHECKUP: "كشف أول",
  FOLLOWUP: "متابعة",
  EMERGENCY: "طوارئ",
};

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  const [appointment, filterOptions] = await Promise.all([
    getAppointmentById(id, user.id, user.role, user.branches),
    getAppointmentFilterOptions(user.role, user.branches),
  ]);
  if (!appointment) notFound();

  const rows = [
    { icon: User, label: "المريض", value: appointment.patient.fullName, extra: appointment.patient.phone },
    { icon: Stethoscope, label: "الطبيب", value: appointment.doctor.name },
    { icon: Building2, label: "الفرع", value: appointment.branch.name },
    { icon: Clock, label: "الموعد", value: formatDateTime(appointment.dateTime) },
    { icon: Calendar, label: "المدة", value: `${appointment.durationMinutes} دقيقة` },
  ];

  return (
    <div className="mx-auto w-full max-w-200 space-y-4 px-6 py-8 sm:px-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">تفاصيل الموعد</h1>
          <Badge className={cn("rounded-full", STATUS_CLASS[appointment.status])}>
            {STATUS_LABEL[appointment.status]}
          </Badge>
          <Badge variant="secondary">{TYPE_LABEL[appointment.type] ?? appointment.type}</Badge>
        </div>
        <div className="flex items-center gap-1.5">
          {appointment.status === "CONFIRMED" && (
            <Button variant="amber" nativeButton={false} render={<Link href={`/appointments/${appointment.id}/edit`} />}>
              تعديل
              <Pencil data-icon="inline-end" />
            </Button>
          )}
          <AppointmentStatusActions
            appointmentId={appointment.id}
            status={appointment.status}
            patientName={appointment.patient.fullName}
            branchId={appointment.branchId}
            doctorId={appointment.doctorId}
            dateTime={appointment.dateTime}
            branches={filterOptions.branches}
            doctors={filterOptions.doctors}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-6">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-start gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <row.icon className="size-4.5" strokeWidth={1.8} />
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{row.label}</dt>
                <dd className="text-sm font-semibold text-foreground">{row.value}</dd>
                {row.extra && (
                  <dd className="text-xs text-muted-foreground" dir="ltr">
                    {row.extra}
                  </dd>
                )}
              </div>
            </div>
          ))}
        </dl>

        {appointment.notes && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">ملاحظات</p>
            <p className="mt-1 whitespace-pre-line text-sm text-foreground">{appointment.notes}</p>
          </div>
        )}

        <div className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
          أنشأ الموعد: {appointment.createdByUser.name}
        </div>
      </div>
    </div>
  );
}
