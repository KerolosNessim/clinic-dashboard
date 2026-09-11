import Link from "next/link";
import { CalendarPlus, CalendarX, Eye, Pencil, Table2, CalendarDays } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-utils";
import {
  getAppointments,
  getWeeklyAppointments,
  getAppointmentFilterOptions,
  type AppointmentFilters,
} from "@/lib/data/appointments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTablePrimaryCell, type DataTableColumn } from "@/components/shared/data-table";
import { AppointmentsFilters } from "@/components/appointments/appointments-filters";
import { AppointmentsCalendar } from "@/components/appointments/appointments-calendar";
import { AppointmentStatusActions } from "@/components/appointments/appointment-status-actions";
import { cn } from "@/lib/utils";
import type { AppointmentStatus, Role } from "@/generated/prisma/client";

type AppointmentRow = Awaited<ReturnType<typeof getAppointments>>["appointments"][number];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]).join("");
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

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

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/** Parses a "YYYY-MM-DD" search param as a local date, not UTC — avoids the day drifting across timezones. */
function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const sp = await searchParams;
  const view = sp.view === "calendar" ? "calendar" : "table";

  const filterOptions = await getAppointmentFilterOptions(user.role, user.branches);

  const tabHref = (nextView: string) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      if (value && key !== "view") params.set(key, value);
    }
    params.set("view", nextView);
    return `/appointments?${params.toString()}`;
  };

  return (
    <div className="mx-auto w-full max-w-350 space-y-4 px-6 py-8 sm:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">المواعيد</h1>
        <Button className="h-11!" nativeButton={false} render={<Link href="/appointments/new" />}>
          حجز موعد جديد
          <CalendarPlus data-icon="inline-end" />
        </Button>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          variant={view === "table" ? "sky" : "outline"}
          className="h-10!"
          nativeButton={false}
          render={<Link href={tabHref("table")} />}
        >
          <Table2 data-icon="inline-end" />
          جدول
        </Button>
        <Button
          variant={view === "calendar" ? "sky" : "outline"}
          className="h-10!"
          nativeButton={false}
          render={<Link href={tabHref("calendar")} />}
        >
          <CalendarDays data-icon="inline-end" />
          عرض أسبوعي
        </Button>
      </div>

      {view === "calendar" ? (
        <CalendarView searchParams={sp} userId={user.id} role={user.role} branchIds={user.branches} />
      ) : (
        <TableView searchParams={sp} userId={user.id} role={user.role} branchIds={user.branches} filterOptions={filterOptions} />
      )}
    </div>
  );
}

async function CalendarView({
  searchParams,
  userId,
  role,
  branchIds,
}: {
  searchParams: Record<string, string | undefined>;
  userId: string;
  role: Role;
  branchIds: string[];
}) {
  const weekStart = searchParams.week ? startOfWeek(parseLocalDate(searchParams.week)) : startOfWeek(new Date());
  const appointments = await getWeeklyAppointments(weekStart, userId, role, branchIds);

  return (
    <AppointmentsCalendar
      weekStart={weekStart}
      appointments={appointments}
      basePath="/appointments"
      searchParams={searchParams}
    />
  );
}

async function TableView({
  searchParams,
  userId,
  role,
  branchIds,
  filterOptions,
}: {
  searchParams: Record<string, string | undefined>;
  userId: string;
  role: Role;
  branchIds: string[];
  filterOptions: Awaited<ReturnType<typeof getAppointmentFilterOptions>>;
}) {
  const filters: AppointmentFilters = {
    search: searchParams.q,
    branchId: searchParams.branch,
    doctorId: searchParams.doctor,
    status: searchParams.status,
    from: searchParams.from,
    to: searchParams.to,
    page: searchParams.page ? Number(searchParams.page) : 1,
  };

  const { appointments, total, page, pageSize } = await getAppointments(filters, userId, role, branchIds);

  const columns: DataTableColumn<AppointmentRow>[] = [
    {
      id: "patient",
      header: "المريض",
      cell: (a) => <DataTablePrimaryCell title={a.patient.fullName} subtitle={a.patient.phone} avatarText={initials(a.patient.fullName)} />,
    },
    {
      id: "time",
      header: "الوقت",
      cell: (a) => <span className="font-medium text-slate-700">{formatDateTime(a.dateTime)}</span>,
    },
    {
      id: "doctor",
      header: "الطبيب",
      hideBelow: "sm",
      cell: (a) => <span className="text-slate-600">{a.doctor.name}</span>,
    },
    {
      id: "branch",
      header: "الفرع",
      hideBelow: "md",
      cell: (a) => <span className="text-slate-600">{a.branch.name}</span>,
    },
    {
      id: "status",
      header: "الحالة",
      cell: (a) => <Badge className={cn("rounded-full", STATUS_CLASS[a.status])}>{STATUS_LABEL[a.status]}</Badge>,
    },
  ];

  return (
    <>
      <AppointmentsFilters branches={filterOptions.branches} doctors={filterOptions.doctors} />

      <DataTable
        columns={columns}
        data={appointments}
        getRowId={(a) => a.id}
        actions={(a) => (
          <div className="flex items-center gap-1.5">
            <Button variant="sky" nativeButton={false} render={<Link href={`/appointments/${a.id}`} />}>
              عرض
              <Eye data-icon="inline-end" />
            </Button>
            {a.status === "CONFIRMED" && (
              <Button variant="amber" nativeButton={false} render={<Link href={`/appointments/${a.id}/edit`} />}>
                تعديل
                <Pencil data-icon="inline-end" />
              </Button>
            )}
            <AppointmentStatusActions
              appointmentId={a.id}
              status={a.status}
              patientName={a.patient.fullName}
              branchId={a.branchId}
              doctorId={a.doctorId}
              dateTime={a.dateTime}
              branches={filterOptions.branches}
              doctors={filterOptions.doctors}
            />
          </div>
        )}
        empty={{ icon: CalendarX, title: "لا توجد مواعيد", description: "ابدأ بحجز أول موعد" }}
        pagination={{
          page,
          pageSize,
          total,
          basePath: "/appointments",
          searchParams: {
            q: filters.search,
            branch: filters.branchId,
            doctor: filters.doctorId,
            status: filters.status,
            from: filters.from,
            to: filters.to,
          },
        }}
      />
    </>
  );
}
