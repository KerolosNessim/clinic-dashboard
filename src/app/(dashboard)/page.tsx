import Link from "next/link";
import {
  CalendarPlus,
  Wallet,
  CalendarCheck2,
  ClipboardList,
  UserPlus,
  Eye,
  Pencil,
  CalendarX,
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth-utils";
import {
  getTodayStats,
  getTodayAppointments,
  getAppointmentsTrend,
  getAppointmentStatusBreakdown,
} from "@/lib/actions/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AppointmentStatus } from "@/generated/prisma/client";
import { AppointmentsTrendChart } from "@/components/dashboard/appointments-trend-chart";
import { AppointmentStatusChart } from "@/components/dashboard/appointment-status-chart";
import {
  DataTable,
  DataTablePrimaryCell,
  type DataTableColumn,
} from "@/components/shared/data-table";
import { ViewAllLink } from "@/components/shared/view-all-link";
import { formatCurrency } from "@/lib/format";

type TodayAppointment = Awaited<
  ReturnType<typeof getTodayAppointments>
>[number];

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("ar-EG", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
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

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [stats, appointments, trend, statusBreakdown] = await Promise.all([
    getTodayStats(user.id, user.role, user.branches),
    getTodayAppointments(user.id, user.role, user.branches),
    getAppointmentsTrend(user.id, user.role, user.branches),
    getAppointmentStatusBreakdown(user.id, user.role, user.branches),
  ]);

  const today = new Intl.DateTimeFormat("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const greetingName = user.name?.split(" ").slice(0, 2).join(" ") ?? "";

  const cards = [
    stats.monthlyRevenue !== undefined && user.role === "SUPER_ADMIN"
      ? {
          key: "revenue",
          label: "إيرادات الشهر",
          value: formatCurrency(stats.monthlyRevenue),
          note: null,
          icon: Wallet,
          accent: "bg-emerald-50 text-emerald-600",
        }
      : null,
    {
      key: "appointments",
      label: "مواعيد اليوم",
      value: formatCount(stats.todayAppointments),
      note: null,
      icon: CalendarCheck2,
      accent: "bg-sky-50 text-sky-600",
    },
    user.role === "SUPER_ADMIN"
      ? {
          key: "pending",
          label: "طلبات معلّقة",
          value: formatCount(stats.pendingApprovals),
          note: stats.pendingApprovals > 0 ? "تحتاج مراجعة الأدمن" : null,
          icon: ClipboardList,
          accent: "bg-amber-50 text-amber-600",
        }
      : null,
    {
      key: "patients",
      label: "مرضى جدد",
      value: formatCount(stats.newPatientsThisWeek),
      note: null,
      icon: UserPlus,
      accent: "bg-teal-50 text-teal-600",
    },
  ].filter(Boolean) as {
    key: string;
    label: string;
    value: string;
    note: string | null;
    icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
    accent: string;
  }[];

  return (
    <div className="mx-auto w-full max-w-350 px-6 py-8 sm:px-8 space-y-4">
      <div className="mb-8 flex items-start justify-between max-md:flex-col max-md:gap-4">
        <div className="text-right">
          <p className="text-[11px] font-semibold tracking-[0.06em] text-slate-400">
            {today}
          </p>
          <h1 className="mt-1.5 text-[28px] font-bold text-foreground">
            مرحباً، {greetingName} 👋
          </h1>
        </div>
        <Link
          href="/appointments/new"
          className="flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 max-md:self-end"
        >
          حجز موعد
          <CalendarPlus className="size-4.5" strokeWidth={1.8} />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div key={card.key} className="rounded-xl border border-border bg-white p-5">
            <div className="flex items-start justify-between">
              <div className={cn("flex size-10 items-center justify-center rounded-lg", card.accent)}>
                <card.icon className="size-5" strokeWidth={1.8} />
              </div>
              <p className="text-sm font-semibold tracking-[0.06em] text-slate-400">{card.label}</p>
            </div>
            <p className="mt-5 text-3xl font-extrabold tracking-tight tabular-nums text-foreground">
              {card.value}
            </p>
            {card.note && <p className="mt-1 text-xs font-medium text-amber-600">{card.note}</p>}
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="text-sm font-semibold text-foreground">
            المواعيد آخر 7 أيام
          </p>
          <div className="mt-3">
            <AppointmentsTrendChart data={trend} />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="text-sm font-semibold text-foreground">
            توزيع حالات المواعيد
          </p>
          <p className="text-xs text-muted-foreground">آخر 7 أيام</p>
          {statusBreakdown.length === 0 ? (
            <div className="flex h-55 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                لا توجد بيانات كافية
              </p>
            </div>
          ) : (
            <AppointmentStatusChart data={statusBreakdown} />
          )}
        </div>
      </div>

      <DataTable
        title="مواعيد اليوم"
        toolbarEnd={
          <div className="flex items-center gap-4 ">
            <Badge className="rounded-full bg-sky-100 text-sky-700">
              {appointments.length} موعد
            </Badge>
            <ViewAllLink href="/appointments" />
          </div>
        }
        columns={appointmentColumns}
        data={appointments}
        getRowId={(appt) => appt.id}
        actions={(appt) => (
          <div className="flex items-center  gap-1.5">
            <Button
              variant="sky"
              nativeButton={false}
              render={<Link href={`/appointments/${appt.id}`} />}
            >
              عرض
              <Eye data-icon="inline-end" />
            </Button>
            <Button
              variant="amber"
              nativeButton={false}
              render={<Link href={`/appointments/${appt.id}/edit`} />}
            >
              تعديل
              <Pencil data-icon="inline-end" />
            </Button>
          </div>
        )}
        empty={{ icon: CalendarX, title: "لا توجد مواعيد اليوم" }}
      />
    </div>
  );
}

const appointmentColumns: DataTableColumn<TodayAppointment>[] = [
  {
    id: "patient",
    header: "المريض",
    cell: (appt) => (
      <DataTablePrimaryCell
        title={appt.patient.fullName}
        subtitle={`رقم: ${appt.patient.id.slice(-5)}`}
        avatarText={initials(appt.patient.fullName)}
      />
    ),
  },
  {
    id: "doctor",
    header: "الطبيب",
    hideBelow: "sm",
    cell: (appt) => (
      <DataTablePrimaryCell
        title={appt.doctor.name}
        avatarText={initials(appt.doctor.name)}
        avatarClassName="bg-teal-100 text-teal-700"
      />
    ),
  },
  {
    id: "time",
    header: "الوقت",
    cell: (appt) => (
      <span className="font-medium text-slate-700">
        {formatTime(appt.dateTime)}
      </span>
    ),
  },
  {
    id: "procedure",
    header: "التشحيص",
    hideBelow: "md",
    cell: (appt) => (
      <span className="text-slate-600">
        {appt.doctor.doctorProfile?.specialty ?? "—"}
      </span>
    ),
  },
  {
    id: "status",
    header: "الحالة",
    cell: (appt) => (
      <Badge className={cn("rounded-full", STATUS_CLASS[appt.status])}>
        {STATUS_LABEL[appt.status]}
      </Badge>
    ),
  },
];
