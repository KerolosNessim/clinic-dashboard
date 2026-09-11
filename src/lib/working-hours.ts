// Same day order/shape produced by the branch working-hours form (components/branches/branch-form-dialog.tsx).
export const WORKING_HOURS_DAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"] as const;

export type WorkingHoursEntry = { day: string; closed: boolean; open?: string; close?: string };

const DEFAULT_HOURS = { closed: false, open: "08:00", close: "20:00" };

/** JS Date#getDay(): 0=Sunday…6=Saturday → index into WORKING_HOURS_DAYS (which starts on Saturday). */
function dayIndexForDate(date: Date) {
  return (date.getDay() + 1) % 7;
}

/**
 * Resolves the branch's open/close hours for the given date's weekday.
 * Falls back to a permissive default (08:00–20:00) when workingHours isn't the
 * expected array shape, so booking isn't blocked by unmigrated/legacy branch data.
 */
export function getDayHours(workingHours: unknown, date: Date): { closed: boolean; open: string; close: string } {
  if (!Array.isArray(workingHours)) return DEFAULT_HOURS;

  const dayName = WORKING_HOURS_DAYS[dayIndexForDate(date)];
  const entry = (workingHours as WorkingHoursEntry[]).find((e) => e?.day === dayName);
  if (!entry) return DEFAULT_HOURS;

  if (entry.closed) return { closed: true, open: "", close: "" };
  if (!entry.open || !entry.close) return DEFAULT_HOURS;

  return { closed: false, open: entry.open, close: entry.close };
}

/** Whether an "HH:MM" time falls within [open, close), both "HH:MM". */
export function isTimeWithinHours(time: string, open: string, close: string) {
  return time >= open && time < close;
}

const time12hFormatter = new Intl.DateTimeFormat("ar-EG", { hour: "numeric", minute: "2-digit", hour12: true });

/** Formats an "HH:MM" (24h) string as a 12h Arabic time, e.g. "08:00" → "٨:٠٠ ص". */
export function formatTime12h(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return time12hFormatter.format(date);
}
