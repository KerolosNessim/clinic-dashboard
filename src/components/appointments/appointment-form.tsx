"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircleIcon, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { DatePicker } from "@/components/shared/date-picker";
import { PatientCombobox } from "@/components/appointments/patient-combobox";
import { createAppointment, updateAppointment, checkAppointmentAvailability } from "@/lib/actions/appointments";
import { getDayHours, formatTime12h } from "@/lib/working-hours";
import { cn } from "@/lib/utils";

const TYPE_OPTIONS = [
  { value: "CHECKUP", label: "كشف أول" },
  { value: "FOLLOWUP", label: "متابعة" },
  { value: "EMERGENCY", label: "طوارئ" },
] as const;

const DURATION_OPTIONS = [30, 45, 60] as const;

const formSchema = z
  .object({
    patientId: z.string().optional(),
    // "كشف عادي" — a walk-in visit that hasn't committed to a full patient registration yet.
    walkInName: z.string().optional(),
    walkInPhone: z.string().optional(),
    doctorId: z.string().min(1, "الطبيب مطلوب"),
    branchId: z.string().min(1, "الفرع مطلوب"),
    date: z.string().min(1, "التاريخ مطلوب"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "الوقت مطلوب"),
    durationMinutes: z.string().min(1),
    type: z.enum(["CHECKUP", "FOLLOWUP", "EMERGENCY"]),
    notes: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.patientId) return;
    if (!values.walkInName || values.walkInName.trim().length < 2) {
      ctx.addIssue({ code: "custom", message: "اسم المريض مطلوب", path: ["walkInName"] });
    }
    if (!values.walkInPhone || !/^01[0125][0-9]{8}$/.test(values.walkInPhone)) {
      ctx.addIssue({ code: "custom", message: "رقم هاتف مصري غير صحيح", path: ["walkInPhone"] });
    }
  });

type FormValues = z.infer<typeof formSchema>;

function toDateValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function toTimeValue(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function AppointmentForm({
  branches,
  doctors,
  fixedDoctorId,
  defaultBranchId,
  appointment,
}: {
  branches: { id: string; name: string; workingHours: unknown }[];
  doctors: { id: string; name: string; branchIds: string[] }[];
  /** For a DOCTOR user, they can only book for themselves */
  fixedDoctorId?: string;
  defaultBranchId: string;
  appointment?: {
    id: string;
    patientId: string;
    patientName: string;
    doctorId: string;
    branchId: string;
    dateTime: Date;
    durationMinutes: number;
    type: FormValues["type"];
    notes: string | null;
  };
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [patientMode, setPatientMode] = useState<"registered" | "walkin">("registered");
  const [patientName, setPatientName] = useState(appointment?.patientName ?? "");
  const [selectedBranchId, setSelectedBranchId] = useState(appointment?.branchId ?? defaultBranchId);
  const [selectedDate, setSelectedDate] = useState(appointment ? toDateValue(appointment.dateTime) : "");
  const [selectedDoctorId, setSelectedDoctorId] = useState(appointment?.doctorId ?? fixedDoctorId ?? "");
  const [selectedTime, setSelectedTime] = useState(appointment ? toTimeValue(appointment.dateTime) : "");
  const [selectedDuration, setSelectedDuration] = useState(
    appointment ? String(appointment.durationMinutes) : "30"
  );
  const [availability, setAvailability] = useState<{ status: "idle" | "checking" | "ok" | "conflict"; message?: string }>(
    { status: "idle" }
  );
  const router = useRouter();
  const isEdit = !!appointment;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: appointment
      ? {
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          branchId: appointment.branchId,
          date: toDateValue(appointment.dateTime),
          time: toTimeValue(appointment.dateTime),
          durationMinutes: String(appointment.durationMinutes),
          type: appointment.type,
          notes: appointment.notes ?? "",
        }
      : {
          patientId: "",
          walkInName: "",
          walkInPhone: "",
          doctorId: fixedDoctorId ?? "",
          branchId: defaultBranchId,
          date: "",
          time: "",
          durationMinutes: "30",
          type: "CHECKUP",
          notes: "",
        },
  });

  const availableDoctors = fixedDoctorId
    ? doctors.filter((d) => d.id === fixedDoctorId)
    : doctors.filter((d) => !selectedBranchId || d.branchIds.includes(selectedBranchId));

  const selectedBranch = branches.find((b) => b.id === selectedBranchId);
  const dayHours = selectedBranch && selectedDate ? getDayHours(selectedBranch.workingHours, new Date(selectedDate)) : null;

  const hasAllSlotFields = !!(selectedBranchId && selectedDoctorId && selectedDate && selectedTime);
  const availabilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live conflict/working-hours check, debounced — doesn't replace the authoritative server-side check on submit.
  // Triggered from each field's onChange (not an effect) since it's a response to user input, not external state.
  function scheduleAvailabilityCheck(next: {
    branchId?: string;
    doctorId?: string;
    date?: string;
    time?: string;
    duration?: string;
  }) {
    if (availabilityTimeoutRef.current) clearTimeout(availabilityTimeoutRef.current);

    const branchId = next.branchId ?? selectedBranchId;
    const doctorIdValue = next.doctorId ?? selectedDoctorId;
    const dateValue = next.date ?? selectedDate;
    const timeValue = next.time ?? selectedTime;
    const durationValue = next.duration ?? selectedDuration;

    if (!branchId || !doctorIdValue || !dateValue || !timeValue) {
      setAvailability({ status: "idle" });
      return;
    }

    setAvailability({ status: "checking" });
    availabilityTimeoutRef.current = setTimeout(async () => {
      const result = await checkAppointmentAvailability({
        branchId,
        doctorId: doctorIdValue,
        date: dateValue,
        time: timeValue,
        durationMinutes: durationValue,
        excludeId: appointment?.id,
      });
      setAvailability(result.available ? { status: "ok" } : { status: "conflict", message: result.error });
    }, 400);
  }

  function onSubmit(values: FormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateAppointment(appointment!.id, values)
        : await createAppointment(values);

      if (result?.error) {
        setServerError(result.error);
        return;
      }

      router.push("/appointments");
      router.refresh();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FieldGroup>
        {serverError && (
          <Alert variant="destructive" className="bg-red-50 text-start text-red-700">
            <AlertCircleIcon className="size-4 text-red-700" />
            <AlertTitle>{serverError}</AlertTitle>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {!isEdit && (
            <Field className="sm:col-span-2">
              <FieldLabel>نوع الكشف</FieldLabel>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPatientMode("registered");
                    form.setValue("walkInName", "");
                    form.setValue("walkInPhone", "");
                  }}
                  className={cn(
                    "h-11 flex-1 rounded-lg border text-sm font-medium transition-colors",
                    patientMode === "registered"
                      ? "border-sky-400 bg-sky-50 text-sky-700"
                      : "border-input bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  مريض مسجل
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPatientMode("walkin");
                    form.setValue("patientId", "");
                    setPatientName("");
                  }}
                  className={cn(
                    "h-11 flex-1 rounded-lg border text-sm font-medium transition-colors",
                    patientMode === "walkin"
                      ? "border-sky-400 bg-sky-50 text-sky-700"
                      : "border-input bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  كشف عادي (أول مرة)
                </button>
              </div>
            </Field>
          )}

          {patientMode === "registered" || isEdit ? (
            <Controller
              name="patientId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
                  <FieldLabel>المريض</FieldLabel>
                  <PatientCombobox
                    value={field.value ?? ""}
                    displayName={patientName}
                    ariaInvalid={fieldState.invalid}
                    onChange={(p) => {
                      field.onChange(p.id);
                      setPatientName(p.fullName);
                    }}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          ) : (
            <>
              <Controller
                name="walkInName"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="walkInName">اسم المريض</FieldLabel>
                    <Input {...field} id="walkInName" className="h-11!" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="walkInPhone"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="walkInPhone">رقم الهاتف</FieldLabel>
                    <Input
                      {...field}
                      id="walkInPhone"
                      dir="ltr"
                      placeholder="01XXXXXXXXX"
                      className="h-11!"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </>
          )}

          <Controller
            name="branchId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>الفرع</FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    setSelectedBranchId(v ?? "");
                    if (!fixedDoctorId) form.setValue("doctorId", "");
                    scheduleAvailabilityCheck({ branchId: v ?? "", doctorId: fixedDoctorId ?? "" });
                  }}
                >
                  <SelectTrigger className="h-11! w-full" aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="اختر الفرع">
                      {(value: string) => branches.find((b) => b.id === value)?.name ?? "اختر الفرع"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="doctorId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>الطبيب</FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    setSelectedDoctorId(v ?? "");
                    scheduleAvailabilityCheck({ doctorId: v ?? "" });
                  }}
                  disabled={!!fixedDoctorId}
                >
                  <SelectTrigger className="h-11! w-full" aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="اختر الطبيب">
                      {(value: string) => availableDoctors.find((d) => d.id === value)?.name ?? "اختر الطبيب"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {availableDoctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="date"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>التاريخ</FieldLabel>
                <DatePicker
                  value={field.value}
                  onChange={(v) => {
                    field.onChange(v);
                    setSelectedDate(v);
                    scheduleAvailabilityCheck({ date: v });
                  }}
                  disabledBefore={startOfToday()}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                {dayHours?.closed && (
                  <p className="text-xs font-medium text-destructive">الفرع مغلق في هذا اليوم</p>
                )}
              </Field>
            )}
          />

          <Controller
            name="time"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="time">الوقت</FieldLabel>
                <Input
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    setSelectedTime(e.target.value);
                    scheduleAvailabilityCheck({ time: e.target.value });
                  }}
                  id="time"
                  type="time"
                  dir="ltr"
                  className="h-11!"
                  min={dayHours && !dayHours.closed ? dayHours.open : undefined}
                  max={dayHours && !dayHours.closed ? dayHours.close : undefined}
                  disabled={!!dayHours?.closed}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                {dayHours && !dayHours.closed && (
                  <p className="text-xs text-muted-foreground">
                    الفرع متاح من {formatTime12h(dayHours.open)} إلى {formatTime12h(dayHours.close)}
                  </p>
                )}
              </Field>
            )}
          />

          <Controller
            name="durationMinutes"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel>المدة</FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    setSelectedDuration(v ?? "30");
                    scheduleAvailabilityCheck({ duration: v ?? "30" });
                  }}
                >
                  <SelectTrigger className="h-11! w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {DURATION_OPTIONS.map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d} دقيقة
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />

          <Controller
            name="type"
            control={form.control}
            render={({ field }) => (
              <Field className="sm:col-span-2">
                <FieldLabel>نوع الزيارة</FieldLabel>
                <div className="flex gap-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => field.onChange(opt.value)}
                      className={cn(
                        "h-11 flex-1 rounded-lg border text-sm font-medium transition-colors",
                        field.value === opt.value
                          ? "border-sky-400 bg-sky-50 text-sky-700"
                          : "border-input bg-background text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </Field>
            )}
          />

          {hasAllSlotFields && (
            <div className="sm:col-span-2">
              {availability.status === "checking" && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" />
                  جارٍ التحقق من توفر الموعد...
                </p>
              )}
              {availability.status === "ok" && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                  <CheckCircle2 className="size-3.5" />
                  الموعد متاح
                </p>
              )}
              {availability.status === "conflict" && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                  <AlertCircleIcon className="size-3.5" />
                  {availability.message}
                </p>
              )}
            </div>
          )}

          <Controller
            name="notes"
            control={form.control}
            render={({ field }) => (
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="notes">ملاحظة</FieldLabel>
                <Textarea {...field} id="notes" />
              </Field>
            )}
          />
        </div>
      </FieldGroup>

      <div className="flex items-center justify-end gap-2">
        <Button className="h-11!" type="button" variant="outline" onClick={() => router.push("/appointments")}>
          إلغاء
        </Button>
        <Button
          className="h-11!"
          type="submit"
          disabled={
            isPending || (hasAllSlotFields && (availability.status === "conflict" || availability.status === "checking"))
          }
        >
          {isPending && <Spinner />}
          {isEdit ? "حفظ التعديلات" : "تأكيد الحجز"}
        </Button>
      </div>
    </form>
  );
}
