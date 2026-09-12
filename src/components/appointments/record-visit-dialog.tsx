"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircleIcon, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { DatePicker } from "@/components/shared/date-picker";
import { recordVisit } from "@/lib/actions/visits";
import { getDayHours, formatTime12h } from "@/lib/working-hours";
import { isSameCalendarDay } from "@/lib/date-utils";

const nextAppointmentFormSchema = z.object({
  branchId: z.string().optional(),
  doctorId: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
});

const visitFormSchema = z
  .object({
    diagnosis: z.string().min(1, "التشخيص مطلوب"),
    procedure: z.string().min(1, "الإجراء مطلوب"),
    sessionCost: z.string().min(1, "سعر الجلسة مطلوب"),
    doctorNotes: z.string().optional(),
    nextStep: z.string().optional(),
    bookNextAppointment: z.boolean(),
    nextAppointment: nextAppointmentFormSchema,
  })
  // nextAppointment's fields are only required when the user actually opts into booking a
  // follow-up — otherwise they stay untouched defaults and must not block submission.
  .superRefine((values, ctx) => {
    if (!values.bookNextAppointment) return;
    if (!values.nextAppointment.branchId) {
      ctx.addIssue({ code: "custom", message: "الفرع مطلوب", path: ["nextAppointment", "branchId"] });
    }
    if (!values.nextAppointment.doctorId) {
      ctx.addIssue({ code: "custom", message: "الطبيب مطلوب", path: ["nextAppointment", "doctorId"] });
    }
    if (!values.nextAppointment.date) {
      ctx.addIssue({ code: "custom", message: "التاريخ مطلوب", path: ["nextAppointment", "date"] });
    }
    if (!values.nextAppointment.time || !/^\d{2}:\d{2}$/.test(values.nextAppointment.time)) {
      ctx.addIssue({ code: "custom", message: "الوقت مطلوب", path: ["nextAppointment", "time"] });
    }
  });

type FormValues = z.infer<typeof visitFormSchema>;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function RecordVisitDialog({
  appointmentId,
  patientName,
  branchId,
  doctorId,
  dateTime,
  branches,
  doctors,
}: {
  appointmentId: string;
  patientName?: string;
  branchId: string;
  doctorId: string;
  dateTime: Date;
  branches: { id: string; name: string; workingHours: unknown }[];
  doctors: { id: string; name: string; branchIds: string[] }[];
}) {
  const isToday = isSameCalendarDay(new Date(dateTime), new Date());
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [nextBranchId, setNextBranchId] = useState(branchId);
  const [nextDate, setNextDate] = useState("");
  const [bookNextAppointment, setBookNextAppointment] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(visitFormSchema),
    defaultValues: {
      diagnosis: "",
      procedure: "",
      sessionCost: "",
      doctorNotes: "",
      nextStep: "",
      bookNextAppointment: false,
      nextAppointment: { branchId, doctorId, date: "", time: "" },
    },
  });

  const nextBranch = branches.find((b) => b.id === nextBranchId);
  const nextDayHours = nextBranch && nextDate ? getDayHours(nextBranch.workingHours, new Date(nextDate)) : null;
  const nextDoctors = doctors.filter((d) => !nextBranchId || d.branchIds.includes(nextBranchId));

  function onSubmit(values: FormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await recordVisit(appointmentId, {
        ...values,
        nextAppointment: values.bookNextAppointment ? values.nextAppointment : null,
      });
      if (result?.error) {
        setServerError(result.error);
        return;
      }
      setOpen(false);
      form.reset();
      router.refresh();
    });
  }

  if (!isToday) {
    return (
      <Button
        variant="emerald"
        type="button"
        disabled
        title="لا يمكن تسجيل الحضور إلا في نفس يوم الموعد"
      >
        <CheckCircle2 data-icon="inline-end" />
        حضر
      </Button>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setServerError(null);
      }}
    >
      <DialogTrigger
        render={
          <Button variant="emerald" type="button">
            <CheckCircle2 data-icon="inline-end" />
            حضر
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl scrollbar-none" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between gap-2">
          <DialogTitle className="text-xl font-semibold text-sky-500">
            تسجيل الزيارة{patientName ? ` — ${patientName}` : ""}
          </DialogTitle>
          <DialogClose render={<Button variant="sky" className="h-8 w-8 rounded-lg p-0" type="button" />}>
            <X className="size-4" />
          </DialogClose>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            {serverError && (
              <Alert variant="destructive" className="bg-red-50 text-start text-red-700">
                <AlertCircleIcon className="size-4 text-red-700" />
                <AlertTitle>{serverError}</AlertTitle>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Controller
                name="diagnosis"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="diagnosis">التشخيص</FieldLabel>
                    <Input {...field} id="diagnosis" className="h-11!" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="procedure"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="procedure">الإجراء</FieldLabel>
                    <Input {...field} id="procedure" className="h-11!" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="sessionCost"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="sessionCost">سعر الجلسة</FieldLabel>
                    <Input
                      {...field}
                      id="sessionCost"
                      type="number"
                      min="0"
                      step="0.01"
                      dir="ltr"
                      className="h-11!"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="nextStep"
                control={form.control}
                render={({ field }) => (
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="nextStep">الخطوة القادمة (اختياري)</FieldLabel>
                    <Input {...field} id="nextStep" className="h-11!" />
                  </Field>
                )}
              />

              <Controller
                name="doctorNotes"
                control={form.control}
                render={({ field }) => (
                  <Field className="sm:col-span-2">
                    <FieldLabel htmlFor="doctorNotes">ملاحظات الطبيب (اختياري)</FieldLabel>
                    <Textarea {...field} id="doctorNotes" />
                  </Field>
                )}
              />

              <div className="rounded-lg border border-input p-3 sm:col-span-2">
                <Controller
                  name="bookNextAppointment"
                  control={form.control}
                  render={({ field }) => (
                    <Field orientation="horizontal">
                      <FieldLabel htmlFor="bookNextAppointment">حجز موعد المتابعة الآن (اختياري)</FieldLabel>
                      <Switch
                        id="bookNextAppointment"
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          setBookNextAppointment(checked);
                        }}
                      />
                    </Field>
                  )}
                />

                {bookNextAppointment && (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Controller
                      name="nextAppointment.branchId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>الفرع</FieldLabel>
                          <Select
                            value={field.value}
                            onValueChange={(v) => {
                              field.onChange(v);
                              setNextBranchId(v ?? "");
                              form.setValue("nextAppointment.doctorId", "");
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
                      name="nextAppointment.doctorId"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>الطبيب</FieldLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="h-11! w-full" aria-invalid={fieldState.invalid}>
                              <SelectValue placeholder="اختر الطبيب">
                                {(value: string) => nextDoctors.find((d) => d.id === value)?.name ?? "اختر الطبيب"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent alignItemWithTrigger={false}>
                              {nextDoctors.map((d) => (
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
                      name="nextAppointment.date"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>التاريخ</FieldLabel>
                          <DatePicker
                            value={field.value}
                            onChange={(v) => {
                              field.onChange(v);
                              setNextDate(v);
                            }}
                            disabledBefore={startOfToday()}
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />

                    <Controller
                      name="nextAppointment.time"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel htmlFor="nextAppointmentTime">الوقت</FieldLabel>
                          <Input
                            {...field}
                            id="nextAppointmentTime"
                            type="time"
                            dir="ltr"
                            lang="en-US"
                            className="h-11!"
                            min={nextDayHours && !nextDayHours.closed ? nextDayHours.open : undefined}
                            max={nextDayHours && !nextDayHours.closed ? nextDayHours.close : undefined}
                            disabled={!!nextDayHours?.closed}
                            aria-invalid={fieldState.invalid}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          {nextDayHours?.closed && (
                            <p className="text-xs font-medium text-destructive">الفرع مغلق في هذا اليوم</p>
                          )}
                          {nextDayHours && !nextDayHours.closed && (
                            <p className="text-xs text-muted-foreground">
                              الفرع متاح من {formatTime12h(nextDayHours.open)} إلى {formatTime12h(nextDayHours.close)}
                            </p>
                          )}
                        </Field>
                      )}
                    />
                  </div>
                )}
              </div>
            </div>
          </FieldGroup>

          <DialogFooter className="mt-4">
            <Button className="h-11!" type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button className="h-11!" type="submit" disabled={isPending}>
              {isPending && <Spinner />}
              حفظ الزيارة
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
