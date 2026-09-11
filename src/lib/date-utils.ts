/** Same calendar day in local time — used to restrict marking an appointment "attended"/"no-show"
 *  to the day it's actually scheduled for (not before, not after). Kept in its own dependency-free
 *  module (no `prisma` import) so Client Components can use it without pulling server-only code
 *  like `pg` into the browser bundle. */
export function isSameCalendarDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
