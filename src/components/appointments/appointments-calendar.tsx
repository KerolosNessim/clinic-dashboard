import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CalendarAppointment = {
  id: string;
  dateTime: Date;
  durationMinutes: number;
  status: string;
  type: string;
  patient: { fullName: string; phone: string };
  doctor: { id: string; name: string };
  branch: { name: string };
};

// Same status → color mapping as the appointments table badges, so the calendar reads as one system with the data.
const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-sky-100 text-sky-800",
  ATTENDED: "bg-emerald-100 text-emerald-800",
  NO_SHOW: "bg-amber-100 text-amber-800",
  CANCELLED: "bg-slate-100 text-slate-600",
};

const TYPE_LABEL: Record<string, string> = {
  CHECKUP: "كشف أول",
  FOLLOWUP: "متابعة",
  EMERGENCY: "طوارئ",
};

/** Formats a Date as a local (not UTC) YYYY-MM-DD string, so week navigation doesn't drift a day across timezones. */
function toLocalDateValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function buildSlots() {
  const slots: string[] = [];
  for (let h = 8; h <= 20; h++) {
    for (const m of [0, 30]) {
      if (h === 20 && m > 0) continue;
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

const SLOTS = buildSlots();

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function AppointmentsCalendar({
  weekStart,
  appointments,
  basePath,
  searchParams,
}: {
  weekStart: Date;
  appointments: CalendarAppointment[];
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const today = new Date();

  function weekHref(offsetDays: number | null) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value) params.set(key, value);
    }
    params.set("view", "calendar");
    if (offsetDays === null) {
      params.delete("week");
    } else {
      const next = new Date(weekStart);
      next.setDate(next.getDate() + offsetDays);
      params.set("week", toLocalDateValue(next));
    }
    return `${basePath}?${params.toString()}`;
  }

  const dayFormatter = new Intl.DateTimeFormat("ar-EG", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <p className="text-lg font-semibold text-foreground">
          {dayFormatter.format(days[0])} — {dayFormatter.format(days[6])}
        </p>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" nativeButton={false} render={<Link href={weekHref(-7)} />}>
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href={weekHref(null)} />}>
            الأسبوع الحالي
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href={weekHref(7)} />}>
            <ChevronLeft className="size-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-250 grid-cols-[80px_repeat(7,1fr)]">
          <div className="border-b border-border" />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "border-b border-r border-border px-2 py-3 text-center text-sm font-semibold text-slate-600",
                isSameDay(day, today) && "bg-sky-50 text-sky-700"
              )}
            >
              {dayFormatter.format(day)}
            </div>
          ))}

          {SLOTS.map((slot) => (
            <div key={slot} className="contents">
              <div className="border-b border-border px-2 py-2 text-left text-xs text-slate-400" dir="ltr">
                {slot}
              </div>
              {days.map((day) => {
                const slotAppointments = appointments.filter((a) => {
                  if (!isSameDay(a.dateTime, day)) return false;
                  const time = `${String(a.dateTime.getHours()).padStart(2, "0")}:${String(
                    a.dateTime.getMinutes()
                  ).padStart(2, "0")}`;
                  return time === slot;
                });
                return (
                  <div
                    key={day.toISOString() + slot}
                    className={cn(
                      "min-h-24 border-b border-r border-border p-1",
                      isSameDay(day, today) && "bg-sky-50/40"
                    )}
                  >
                    {slotAppointments.map((a) => (
                      <Link
                        key={a.id}
                        href={`/appointments/${a.id}`}
                        className={cn(
                          "flex flex-col gap-0.5 rounded-lg px-2.5 py-2 text-xs",
                          STATUS_COLORS[a.status] ?? STATUS_COLORS.CONFIRMED,
                          a.status === "CANCELLED" && "opacity-60 line-through"
                        )}
                        title={`${a.patient.fullName} — ${a.doctor.name} — ${a.branch.name}`}
                      >
                        <span className="truncate font-semibold">{a.patient.fullName}</span>
                        <span className="truncate opacity-80" dir="ltr">
                          {a.patient.phone}
                        </span>
                        <span className="truncate opacity-80">{TYPE_LABEL[a.type] ?? a.type}</span>
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
