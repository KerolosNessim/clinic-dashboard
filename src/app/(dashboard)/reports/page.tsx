import Link from "next/link";
import { notFound } from "next/navigation";
import { Wallet, Receipt, TrendingUp, CalendarClock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-utils";
import { getFinancialReport, getBranchComparison, getOperationalReport, type ReportRange } from "@/lib/actions/reports";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { ReportDateFilter } from "@/components/reports/report-date-filter";
import { MonthlyRevenueChart } from "@/components/reports/monthly-revenue-chart";
import { ReferralSourceChart } from "@/components/reports/referral-source-chart";
import { NewPatientsChart } from "@/components/reports/new-patients-chart";
import { AttendanceChart } from "@/components/reports/attendance-chart";
import { TopProceduresChart } from "@/components/reports/top-procedures-chart";
import { ExportFinancialPdfButton } from "@/components/reports/export-financial-pdf-button";
import { formatCurrency, formatDate } from "@/lib/format";

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// "YYYY-MM-DD" from a date input must be parsed as local midnight — `new Date(str)`
// treats a date-only ISO string as UTC, which shifts the boundary by Egypt's UTC+2/+3
// offset and made the "from" bound inconsistent with the local-time "to" default.
function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function parseRange(sp: Record<string, string | undefined>): ReportRange {
  const now = new Date();
  const from = sp.from ? parseLocalDate(sp.from) : startOfMonth(now);
  const to = sp.to ? parseLocalDate(sp.to) : now;
  return { from, to };
}

function toDateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== "SUPER_ADMIN") notFound();

  const sp = await searchParams;
  const range = parseRange(sp);

  const [financial, branches, operational] = await Promise.all([
    getFinancialReport(range),
    getBranchComparison(range),
    getOperationalReport(range),
  ]);

  return (
    <div className="mx-auto w-full max-w-350 space-y-4 px-6 py-8 sm:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">التقارير</h1>
      </div>

      <ReportDateFilter />

      <Tabs defaultValue="financial" dir="rtl">
        <TabsList className="h-auto! w-full justify-start bg-white">
          <TabsTrigger value="financial">مالي</TabsTrigger>
          <TabsTrigger value="operational">تشغيلي</TabsTrigger>
          <TabsTrigger value="branches">مقارنة الفروع</TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {formatDate(range.from)} — {formatDate(range.to)}
            </p>
            <ExportFinancialPdfButton
              from={toDateInputValue(range.from)}
              to={toDateInputValue(range.to)}
              totalRevenue={financial.totalRevenue}
              totalExpenses={financial.totalExpenses}
              totalEarnings={financial.totalEarnings}
              netProfit={financial.netProfit}
              branches={branches.map((b) => ({
                branchName: b.branchName,
                revenue: b.revenue,
                expenses: b.expenses,
                netProfit: b.netProfit,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                  <Wallet className="size-5" strokeWidth={1.8} />
                </div>
                <p className="text-sm font-semibold tracking-[0.06em] text-slate-400">إجمالي الإيرادات</p>
              </div>
              <p className="mt-5 text-3xl font-extrabold tracking-tight text-foreground">
                {formatCurrency(financial.totalRevenue)}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <Receipt className="size-5" strokeWidth={1.8} />
                </div>
                <p className="text-sm font-semibold tracking-[0.06em] text-slate-400">إجمالي المصروفات</p>
              </div>
              <p className="mt-5 text-3xl font-extrabold tracking-tight text-foreground">
                {formatCurrency(financial.totalExpenses)}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <TrendingUp className="size-5" strokeWidth={1.8} />
                </div>
                <p className="text-sm font-semibold tracking-[0.06em] text-slate-400">صافي الربح</p>
              </div>
              <p className="mt-5 text-3xl font-extrabold tracking-tight text-foreground">
                {formatCurrency(financial.netProfit)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">بعد خصم المستحقات: {formatCurrency(financial.totalEarnings)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-white p-5">
              <p className="mb-3 text-sm font-semibold text-foreground">الإيرادات الشهرية (آخر 12 شهر)</p>
              <MonthlyRevenueChart data={financial.monthlyRevenue} />
            </div>
            <div className="rounded-xl border border-border bg-white p-5">
              <p className="mb-3 text-sm font-semibold text-foreground">مصادر الترشيح</p>
              {financial.referralBreakdown.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">لا توجد بيانات كافية</p>
              ) : (
                <ReferralSourceChart data={financial.referralBreakdown} />
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-white">
            <div className="border-b border-border px-5 py-4">
              <p className="text-sm font-semibold text-foreground">ملخص الفروع</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الفرع</TableHead>
                  <TableHead>الإيرادات</TableHead>
                  <TableHead>المصروفات</TableHead>
                  <TableHead>صافي الربح</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((b) => (
                  <TableRow key={b.branchId}>
                    <TableCell className="font-medium text-foreground">{b.branchName}</TableCell>
                    <TableCell>{formatCurrency(b.revenue)}</TableCell>
                    <TableCell>{formatCurrency(b.expenses)}</TableCell>
                    <TableCell>{formatCurrency(b.netProfit)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="operational" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-white p-5">
              <p className="mb-3 text-sm font-semibold text-foreground">المرضى الجدد</p>
              {operational.newPatientsTrend.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">لا توجد بيانات كافية</p>
              ) : (
                <NewPatientsChart data={operational.newPatientsTrend} />
              )}
            </div>
            <div className="rounded-xl border border-border bg-white p-5">
              <p className="mb-3 text-sm font-semibold text-foreground">معدل الحضور والغياب</p>
              {operational.attendanceBreakdown.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">لا توجد بيانات كافية</p>
              ) : (
                <AttendanceChart data={operational.attendanceBreakdown} />
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-white p-5">
            <p className="mb-3 text-sm font-semibold text-foreground">الإجراءات الأكثر تكراراً</p>
            {operational.topProcedures.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">لا توجد بيانات كافية</p>
            ) : (
              <TopProceduresChart data={operational.topProcedures} />
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-white">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <CalendarClock className="size-4.5 text-amber-600" />
              <p className="text-sm font-semibold text-foreground">مرضى مستحقون للمتابعة</p>
            </div>
            {operational.upcomingFollowUps.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                لا يوجد مرضى مستحقون للمتابعة حالياً
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>المريض</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>الطبيب</TableHead>
                    <TableHead>تاريخ المتابعة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operational.upcomingFollowUps.map((f) => (
                    <TableRow key={f.visitId}>
                      <TableCell className="font-medium text-foreground">
                        <Link href={`/patients/${f.patientId}`} className="hover:underline">
                          {f.patientName}
                        </Link>
                      </TableCell>
                      <TableCell dir="ltr">{f.patientPhone}</TableCell>
                      <TableCell>{f.doctorName}</TableCell>
                      <TableCell>{formatDate(f.recallDate)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="branches" className="mt-4">
          <div className="overflow-hidden rounded-xl border border-border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الفرع</TableHead>
                  <TableHead>الإيرادات</TableHead>
                  <TableHead>المصروفات</TableHead>
                  <TableHead>صافي الربح</TableHead>
                  <TableHead>عدد المواعيد</TableHead>
                  <TableHead>مرضى جدد</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((b) => (
                  <TableRow key={b.branchId}>
                    <TableCell className="font-medium text-foreground">{b.branchName}</TableCell>
                    <TableCell>{formatCurrency(b.revenue)}</TableCell>
                    <TableCell>{formatCurrency(b.expenses)}</TableCell>
                    <TableCell>{formatCurrency(b.netProfit)}</TableCell>
                    <TableCell>{b.appointmentsCount}</TableCell>
                    <TableCell>{b.newPatientsCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
