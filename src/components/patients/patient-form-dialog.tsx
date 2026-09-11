"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircleIcon, X } from "lucide-react";
import { Button, type buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { createPatient, updatePatient } from "@/lib/actions/patients";
import { DatePicker } from "@/components/shared/date-picker";
import { cn } from "@/lib/utils";

const GENDER_OPTIONS = ["ذكر", "أنثى"] as const;
const MARITAL_OPTIONS = ["أعزب", "متزوج", "مطلق", "أرمل"] as const;

// birthDate/gender/nationalId/emergency contact are optional: a walk-in ("كشف عادي")
// patient created straight from booking has none of these yet, and this dialog is also used
// to edit that same record later — requiring them here would make a walk-in uneditable.
const patientFormSchema = z.object({
  fullName: z.string().min(2, "الاسم مطلوب"),
  birthDate: z.string().optional(),
  gender: z.enum(GENDER_OPTIONS, { message: "اختر النوع" }).or(z.literal("")).optional(),
  phone: z.string().regex(/^01[0125][0-9]{8}$/, "رقم هاتف مصري غير صحيح"),
  nationalId: z.string().regex(/^\d{14}$/, "الرقم القومي يجب أن يكون 14 رقم").or(z.literal("")).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  job: z.string().optional(),
  maritalStatus: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().regex(/^01[0125][0-9]{8}$/, "رقم هاتف مصري غير صحيح").or(z.literal("")).optional(),
  referralSource: z.string().optional(),
  registrationBranchId: z.string().min(1, "الفرع مطلوب"),
});

type FormValues = z.infer<typeof patientFormSchema>;

function toDateInputValue(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10);
}

export function PatientFormDialog({
  triggerLabel,
  triggerVariant = "default",
  triggerIcon,
  branches,
  showBranchSelect,
  defaultBranchId,
  patient,
}: {
  triggerLabel: string;
  triggerVariant?: VariantProps<typeof buttonVariants>["variant"];
  triggerIcon?: React.ReactNode;
  branches: { id: string; name: string }[];
  showBranchSelect: boolean;
  defaultBranchId: string;
  patient?: {
    id: string;
    fullName: string;
    birthDate: Date | null;
    gender: string | null;
    phone: string;
    nationalId: string | null;
    address: string | null;
    city: string | null;
    job: string | null;
    maritalStatus: string | null;
    emergencyName: string | null;
    emergencyPhone: string | null;
    referralSource: string | null;
    registrationBranchId: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isEdit = !!patient;

  const form = useForm<FormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: patient
      ? {
          fullName: patient.fullName,
          birthDate: patient.birthDate ? toDateInputValue(patient.birthDate) : "",
          gender: (patient.gender ?? "") as FormValues["gender"],
          phone: patient.phone,
          nationalId: patient.nationalId ?? "",
          address: patient.address ?? "",
          city: patient.city ?? "",
          job: patient.job ?? "",
          maritalStatus: patient.maritalStatus ?? "",
          emergencyName: patient.emergencyName ?? "",
          emergencyPhone: patient.emergencyPhone ?? "",
          referralSource: patient.referralSource ?? "",
          registrationBranchId: patient.registrationBranchId,
        }
      : {
          fullName: "",
          birthDate: "",
          gender: "" as unknown as FormValues["gender"],
          phone: "",
          nationalId: "",
          address: "",
          city: "",
          job: "",
          maritalStatus: "",
          emergencyName: "",
          emergencyPhone: "",
          referralSource: "",
          registrationBranchId: defaultBranchId,
        },
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updatePatient(patient!.id, values)
        : await createPatient(values);

      if (result?.error) {
        setServerError(result.error);
        return;
      }

      setOpen(false);
      form.reset();
      router.refresh();
    });
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
          <Button variant={triggerVariant} className={cn(!isEdit && "h-11!")} type="button">
            {triggerLabel}
            {triggerIcon}
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl scrollbar-none" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between gap-2">
          <DialogTitle className="text-xl font-semibold text-sky-500">
            {isEdit ? "تعديل بيانات المريض" : "إضافة مريض جديد"}
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

            <div className="grid grid-cols-2 gap-3">
              <Controller
                name="fullName"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="col-span-2">
                    <FieldLabel htmlFor="fullName">الاسم الكامل</FieldLabel>
                    <Input {...field} id="fullName" className="h-11!" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="birthDate"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>تاريخ الميلاد</FieldLabel>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      disabledAfter={new Date()}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="gender"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>النوع</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11! w-full" aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="اختر النوع" />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        {GENDER_OPTIONS.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="phone"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="phone">رقم الهاتف</FieldLabel>
                    <Input
                      {...field}
                      id="phone"
                      dir="ltr"
                      placeholder="01XXXXXXXXX"
                      inputMode="numeric"
                      className="h-11!"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="nationalId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="nationalId">الرقم القومي</FieldLabel>
                    <Input
                      {...field}
                      id="nationalId"
                      dir="ltr"
                      inputMode="numeric"
                      className="h-11!"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="address"
                control={form.control}
                render={({ field }) => (
                  <Field className="col-span-2">
                    <FieldLabel htmlFor="address">العنوان</FieldLabel>
                    <Input {...field} id="address" className="h-11!" />
                  </Field>
                )}
              />

              <Controller
                name="city"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="city">المدينة</FieldLabel>
                    <Input {...field} id="city" className="h-11!" />
                  </Field>
                )}
              />

              <Controller
                name="job"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="job">المهنة</FieldLabel>
                    <Input {...field} id="job" className="h-11!" />
                  </Field>
                )}
              />

              <Controller
                name="maritalStatus"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>الحالة الاجتماعية</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11! w-full">
                        <SelectValue placeholder="اختر" />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        {MARITAL_OPTIONS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />

              <Controller
                name="referralSource"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="referralSource">مصدر الترشيح</FieldLabel>
                    <Input {...field} id="referralSource" className="h-11!" />
                  </Field>
                )}
              />

              {showBranchSelect && (
                <Controller
                  name="registrationBranchId"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>الفرع</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
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
              )}

              <Controller
                name="emergencyName"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="emergencyName">جهة الطوارئ (الاسم)</FieldLabel>
                    <Input
                      {...field}
                      id="emergencyName"
                      className="h-11!"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="emergencyPhone"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="emergencyPhone">جهة الطوارئ (الهاتف)</FieldLabel>
                    <Input
                      {...field}
                      id="emergencyPhone"
                      dir="ltr"
                      placeholder="01XXXXXXXXX"
                      inputMode="numeric"
                      className="h-11!"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
          </FieldGroup>

          <DialogFooter className="mt-4">
            <Button className="h-11!" type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button className="h-11!" type="submit" disabled={isPending}>
              {isPending && <Spinner />}
              {isEdit ? "حفظ التعديلات" : "إضافة المريض"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
