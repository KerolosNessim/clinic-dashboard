import Link from "next/link";
import { notFound } from "next/navigation";
import { Users2, Pencil, Calendar, Stethoscope, Receipt, Eye, Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-utils";
import { getPatientById } from "@/lib/data/patients";
import { getAppointmentFilterOptions } from "@/lib/data/appointments";
import { getPatientInvoices, getUninvoicedVisits } from "@/lib/data/invoices";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PatientFormDialog } from "@/components/patients/patient-form-dialog";
import { MedicalHistoryFormDialog } from "@/components/patients/medical-history-form-dialog";
import { AppointmentStatusActions } from "@/components/appointments/appointment-status-actions";
import { CreateInvoiceDialog } from "@/components/invoices/create-invoice-dialog";
import { PaymentDialog } from "@/components/invoices/payment-dialog";
import { DentalChart } from "@/components/dental-chart/dental-chart";
import { getToothRecords } from "@/lib/data/dental-chart";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/generated/prisma/client";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.slice(0, 2).map((p) => p[0]).join("");
}

function calculateAge(birthDate: Date | null) {
  if (!birthDate) return null;
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function formatCurrency(amount: number) {
  return `${amount.toLocaleString("en-US")} جنيه`;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value ?? "—"}</p>
    </div>
  );
}

const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  PAID: "مدفوعة بالكامل",
  PARTIAL: "مدفوعة جزئياً",
  OVERDUE: "متأخرة السداد",
};

const INVOICE_STATUS_CLASS: Record<InvoiceStatus, string> = {
  PAID: "bg-emerald-100 text-emerald-800",
  PARTIAL: "bg-amber-100 text-amber-800",
  OVERDUE: "bg-red-100 text-red-700",
};

const APPOINTMENT_TYPE_LABEL: Record<string, string> = {
  CHECKUP: "كشف أول",
  FOLLOWUP: "متابعة",
  EMERGENCY: "طوارئ",
};

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function ComingSoon({ label }: { label: string }) {
  return (
    <Empty className="border-0 py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Calendar />
        </EmptyMedia>
        <EmptyTitle>{label}</EmptyTitle>
        <EmptyDescription>هتتاح مع الأمر الخاص بيها لاحقاً</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const { id } = await params;
  const patient = await getPatientById(id, user.role, user.branches);
  if (!patient) notFound();

  const [filterOptions, toothRecords, invoices, uninvoicedVisits] = await Promise.all([
    getAppointmentFilterOptions(user.role, user.branches),
    getToothRecords(patient.id),
    getPatientInvoices(patient.id, user.role, user.branches),
    getUninvoicedVisits(patient.id),
  ]);
  const showBranchSelectInForm = user.role !== "STAFF" || user.branches.length > 1;
  const patientAge = calculateAge(patient.birthDate);
  const isProfileComplete = !!(
    patient.birthDate &&
    patient.gender &&
    patient.nationalId &&
    patient.emergencyName &&
    patient.emergencyPhone
  );

  return (
    <div className="mx-auto w-full max-w-350 px-6 py-8 sm:px-8">
      <div className="sticky top-12 z-5 -mx-6 mb-4 border-b border-border bg-slate-50/95 px-6 py-4 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="size-11">
              <AvatarFallback className="bg-sky-100 text-sky-700">
                {initials(patient.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-foreground">{patient.fullName}</h1>
                {!isProfileComplete && (
                  <Badge className="rounded-full bg-amber-100 text-amber-800">بيانات غير مكتملة</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {[patientAge !== null ? `${patientAge} سنة` : null, patient.gender, patient.registrationBranch.name]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
          <PatientFormDialog
            patient={patient}
            branches={filterOptions.branches}
            showBranchSelect={showBranchSelectInForm}
            defaultBranchId={patient.registrationBranchId}
            triggerLabel="تعديل"
            triggerVariant="amber"
            triggerIcon={<Pencil data-icon="inline-end" />}
          />

        </div>
      </div>

      <Tabs defaultValue="info" dir="rtl">
        <TabsList className="h-auto! w-full justify-start bg-white">
          <TabsTrigger value="info">المعلومات</TabsTrigger>
          <TabsTrigger value="medical">التاريخ الطبي</TabsTrigger>
          <TabsTrigger value="chart">مخطط الأسنان</TabsTrigger>
          <TabsTrigger value="visits">الزيارات</TabsTrigger>
          <TabsTrigger value="plan">خطة العلاج</TabsTrigger>
          <TabsTrigger value="invoices">الفواتير</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <div className="rounded-xl border border-border bg-white p-6">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
              <InfoRow label="رقم الهاتف" value={<span dir="ltr">{patient.phone}</span>} />
              <InfoRow label="الرقم القومي" value={patient.nationalId ? <span dir="ltr">{patient.nationalId}</span> : null} />
              <InfoRow label="العنوان" value={patient.address} />
              <InfoRow label="المدينة" value={patient.city} />
              <InfoRow label="المهنة" value={patient.job} />
              <InfoRow label="الحالة الاجتماعية" value={patient.maritalStatus} />
              <InfoRow label="جهة الطوارئ" value={patient.emergencyName} />
              <InfoRow
                label="هاتف الطوارئ"
                value={patient.emergencyPhone ? <span dir="ltr">{patient.emergencyPhone}</span> : null}
              />
              <InfoRow label="مصدر الترشيح" value={patient.referralSource} />
              <InfoRow label="تاريخ الميلاد" value={patient.birthDate ? formatDate(patient.birthDate) : null} />
              <InfoRow label="تاريخ التسجيل" value={formatDate(patient.createdAt)} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="medical" className="mt-4">
          <div className="rounded-xl border border-border bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xl font-semibold text-foreground">التاريخ الطبي</p>
              <MedicalHistoryFormDialog
                patientId={patient.id}
                gender={patient.gender ?? ""}
                medicalHistory={patient.medicalHistory}
              />
            </div>
            {patient.medicalHistory ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">الحساسية</p>
                  {patient.medicalHistory.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {patient.medicalHistory.allergies.map((a) => (
                        <Badge key={a} className="rounded-full bg-red-100 text-red-700">
                          {a}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">لا يوجد</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-muted-foreground">أمراض مزمنة</p>
                  {patient.medicalHistory.chronicDiseases.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {patient.medicalHistory.chronicDiseases.map((d) => (
                        <Badge key={d} className="rounded-full bg-amber-100 text-amber-800">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">لا يوجد</p>
                  )}
                </div>
                <InfoRow
                  label="أدوية حالية"
                  value={patient.medicalHistory.currentMedications}
                />
                {patient.medicalHistory.isPregnant !== null && (
                  <InfoRow label="حامل" value={patient.medicalHistory.isPregnant ? "نعم" : "لا"} />
                )}
              </div>
            ) : (
              <Empty className="border-0 py-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users2 />
                  </EmptyMedia>
                  <EmptyTitle>لا يوجد تاريخ طبي مسجل</EmptyTitle>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </TabsContent>

        <TabsContent value="chart" className="mt-4">
          <DentalChart patientId={patient.id} initialRecords={toothRecords} />
        </TabsContent>

        <TabsContent value="visits" className="mt-4 space-y-4">
          {patient.appointments.length > 0 && (
            <div className="rounded-xl border border-border bg-white p-5">
              <p className="mb-3 text-sm font-semibold text-foreground">مواعيد مجدولة</p>
              <ul className="divide-y divide-border">
                {patient.appointments.map((appt) => (
                  <li key={appt.id} className="flex flex-col gap-2 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">
                            {APPOINTMENT_TYPE_LABEL[appt.type] ?? appt.type}
                          </p>
                          <Badge className="rounded-full bg-sky-100 text-sky-700">مجدولة</Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {appt.doctor.name} · {appt.branch.name}
                        </p>
                      </div>
                      <div className="shrink-0 text-left">
                        <p className="flex items-center gap-1 text-sm font-medium text-slate-700">
                          <Clock className="size-3.5" />
                          {formatDateTime(appt.dateTime)}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <AppointmentStatusActions
                        appointmentId={appt.id}
                        status={appt.status}
                        patientName={patient.fullName}
                        branchId={appt.branchId}
                        doctorId={appt.doctorId}
                        dateTime={appt.dateTime}
                        branches={filterOptions.branches}
                        doctors={filterOptions.doctors}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-border bg-white">
            {patient.visits.length === 0 ? (
              <Empty className="border-0 py-16">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Stethoscope />
                  </EmptyMedia>
                  <EmptyTitle>لا توجد زيارات مسجلة</EmptyTitle>
                </EmptyHeader>
              </Empty>
            ) : (
              <ul className="divide-y divide-border">
                {patient.visits.map((visit) => (
                  <li key={visit.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{visit.procedure}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{visit.diagnosis}</p>
                      </div>
                      <div className="shrink-0 text-left">
                        <p className="text-sm font-medium text-slate-700">{formatDate(visit.dateTime)}</p>
                        <p className="text-xs text-muted-foreground">
                          {visit.doctor.name} · {visit.branch.name}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-3">
                      <Badge className="rounded-full bg-emerald-100 text-emerald-800">
                        {formatCurrency(Number(visit.sessionCost))}
                      </Badge>
                      {visit.recallDate && (
                        <span className="text-xs font-medium text-amber-700">
                          موعد متابعة: {formatDate(visit.recallDate)}
                        </span>
                      )}
                    </div>

                    {visit.affectedTeeth.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">الأسنان المتأثرة:</span>
                        <div className="flex flex-wrap gap-1" dir="ltr">
                          {visit.affectedTeeth.map((tooth) => (
                            <Badge key={tooth} variant="secondary" className="font-mono">
                              {tooth}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {visit.nextStep && (
                      <p className="mt-2.5 text-xs text-slate-600">
                        <span className="font-medium text-foreground">الخطوة القادمة:</span> {visit.nextStep}
                      </p>
                    )}

                    {visit.doctorNotes && (
                      <p className="mt-2.5 rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        {visit.doctorNotes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="plan" className="mt-4">
          <ComingSoon label="خطة العلاج" />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <div className="space-y-4">
            {uninvoicedVisits.length > 0 && (
              <div className="rounded-xl border border-border bg-white p-5">
                <p className="mb-3 text-sm font-semibold text-foreground">زيارات بدون فاتورة</p>
                <ul className="divide-y divide-border">
                  {uninvoicedVisits.map((visit) => (
                    <li key={visit.id} className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{visit.procedure}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(visit.dateTime)}</p>
                      </div>
                      <CreateInvoiceDialog
                        patientId={patient.id}
                        branchId={visit.branchId}
                        visitId={visit.id}
                        defaultItemName={visit.procedure}
                        defaultPrice={Number(visit.sessionCost)}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="overflow-hidden rounded-xl border border-border bg-white">
              {invoices.length === 0 ? (
                <Empty className="border-0 py-16">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Receipt />
                    </EmptyMedia>
                    <EmptyTitle>لا توجد فواتير مسجلة</EmptyTitle>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ul className="divide-y divide-border">
                  {invoices.map((invoice) => {
                    const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                    return (
                      <li key={invoice.id} className="flex items-center justify-between gap-3 px-5 py-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">فاتورة {invoice.sequenceNumber}</p>
                            <Badge className={cn("rounded-full", INVOICE_STATUS_CLASS[invoice.status])}>
                              {INVOICE_STATUS_LABEL[invoice.status]}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDate(invoice.createdAt)} · مدفوع {formatCurrency(paid)} من{" "}
                            {formatCurrency(Number(invoice.total))}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {invoice.status !== "PAID" && (
                            <PaymentDialog invoiceId={invoice.id} remainingAmount={Number(invoice.total) - paid} />
                          )}
                          <Button variant="sky" nativeButton={false} render={<Link href={`/invoices/${invoice.id}`} />}>
                            عرض
                            <Eye data-icon="inline-end" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
