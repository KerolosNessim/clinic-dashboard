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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { createBranch, updateBranch } from "@/lib/actions/branches";
import { cn } from "@/lib/utils";

const DAYS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"] as const;

const dayHoursSchema = z.object({
  day: z.string(),
  closed: z.boolean(),
  open: z.string().optional(),
  close: z.string().optional(),
});

const branchFormSchema = z.object({
  name: z.string().min(2, "اسم الفرع مطلوب"),
  address: z.string().min(2, "العنوان مطلوب"),
  city: z.string().min(2, "المدينة مطلوبة"),
  phones: z.string().min(2, "أدخل رقم هاتف واحد على الأقل"),
  email: z.string().email("بريد إلكتروني غير صحيح").optional().or(z.literal("")),
  workingHours: z.array(dayHoursSchema),
});

type FormValues = z.infer<typeof branchFormSchema>;
type WorkingHoursValue = { day: string; closed: boolean; open?: string; close?: string };

function defaultWorkingHours(): WorkingHoursValue[] {
  return DAYS.map((day) => ({ day, closed: day === "الجمعة", open: "09:00", close: "17:00" }));
}

export function BranchFormDialog({
  triggerLabel,
  triggerVariant = "default",
  triggerIcon,
  branch,
}: {
  triggerLabel: string;
  triggerVariant?: VariantProps<typeof buttonVariants>["variant"];
  triggerIcon?: React.ReactNode;
  branch?: {
    id: string;
    name: string;
    address: string;
    city: string;
    phones: string[];
    email: string | null;
    workingHours: unknown;
  };
}) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isEdit = !!branch;

  const form = useForm<FormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: branch
      ? {
          name: branch.name,
          address: branch.address,
          city: branch.city,
          phones: branch.phones.join(", "),
          email: branch.email ?? "",
          workingHours: Array.isArray(branch.workingHours)
            ? (branch.workingHours as WorkingHoursValue[])
            : defaultWorkingHours(),
        }
      : {
          name: "",
          address: "",
          city: "",
          phones: "",
          email: "",
          workingHours: defaultWorkingHours(),
        },
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = isEdit ? await updateBranch(branch!.id, values) : await createBranch(values);

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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl scrollbar-none" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between gap-2">
          <DialogTitle className="text-xl font-semibold text-sky-500">
            {isEdit ? "تعديل الفرع" : "إضافة فرع جديد"}
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
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="col-span-2">
                    <FieldLabel htmlFor="name">اسم الفرع</FieldLabel>
                    <Input {...field} id="name" className="h-11!" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="address"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="col-span-2">
                    <FieldLabel htmlFor="address">العنوان</FieldLabel>
                    <Input {...field} id="address" className="h-11!" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="city"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="city">المدينة</FieldLabel>
                    <Input {...field} id="city" className="h-11!" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="email">البريد الإلكتروني</FieldLabel>
                    <Input
                      {...field}
                      id="email"
                      dir="ltr"
                      className="h-11!"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="phones"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="col-span-2">
                    <FieldLabel htmlFor="phones">أرقام الهاتف (مفصولة بفاصلة)</FieldLabel>
                    <Input
                      {...field}
                      id="phones"
                      dir="ltr"
                      placeholder="0223456789, 01000000000"
                      className="h-11!"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="workingHours"
                control={form.control}
                render={({ field }) => (
                  <Field className="col-span-2">
                    <FieldLabel>ساعات العمل</FieldLabel>
                    <div className="space-y-2 rounded-lg border border-input p-3">
                      {field.value.map((entry, index) => (
                        <div key={entry.day} className="grid grid-cols-[80px_1fr_1fr_auto] items-center gap-2">
                          <span className="text-sm text-slate-600">{entry.day}</span>
                          <Input
                            type="time"
                            className="h-9!"
                            disabled={entry.closed}
                            value={entry.open ?? ""}
                            onChange={(e) => {
                              const next = [...field.value];
                              next[index] = { ...entry, open: e.target.value };
                              field.onChange(next);
                            }}
                          />
                          <Input
                            type="time"
                            className="h-9!"
                            disabled={entry.closed}
                            value={entry.close ?? ""}
                            onChange={(e) => {
                              const next = [...field.value];
                              next[index] = { ...entry, close: e.target.value };
                              field.onChange(next);
                            }}
                          />
                          <label className="flex items-center gap-1.5 text-xs whitespace-nowrap text-slate-500">
                            <Checkbox
                              checked={entry.closed}
                              onCheckedChange={(next) => {
                                const updated = [...field.value];
                                updated[index] = { ...entry, closed: !!next };
                                field.onChange(updated);
                              }}
                            />
                            مغلق
                          </label>
                        </div>
                      ))}
                    </div>
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
              {isEdit ? "حفظ التعديلات" : "إضافة الفرع"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
