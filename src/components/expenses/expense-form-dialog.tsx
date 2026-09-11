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
import { Switch } from "@/components/ui/switch";
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
import { DatePicker } from "@/components/shared/date-picker";
import { createExpense, updateExpense } from "@/lib/actions/expenses";
import { cn } from "@/lib/utils";

// Duplicated (not imported from lib/data/expenses.ts) so this Client Component never pulls in
// that module's `prisma`/`pg` import — see inventory-filters.tsx for the same pattern.
const CATEGORY_OPTIONS = [
  { value: "RENT", label: "إيجار" },
  { value: "UTILITIES", label: "مرافق (كهرباء / مياه)" },
  { value: "SALARIES", label: "رواتب" },
  { value: "MAINTENANCE", label: "صيانة" },
  { value: "MARKETING", label: "تسويق" },
  { value: "OTHER", label: "أخرى" },
] as const;

const expenseFormSchema = z.object({
  description: z.string().min(2, "اكتب على أيه اتصرف المبلغ"),
  amount: z.string().min(1, "المبلغ مطلوب"),
  branchId: z.string().min(1, "الفرع مطلوب"),
  category: z.enum(CATEGORY_OPTIONS.map((c) => c.value) as [string, ...string[]], { message: "اختر الفئة" }),
  date: z.string().min(1, "التاريخ مطلوب"),
  isRecurring: z.boolean(),
});

type FormValues = z.infer<typeof expenseFormSchema>;

function toDateInputValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function ExpenseFormDialog({
  branches,
  triggerLabel,
  triggerVariant = "default",
  triggerIcon,
  defaultBranchId,
  expense,
}: {
  branches: { id: string; name: string }[];
  triggerLabel: string;
  triggerVariant?: VariantProps<typeof buttonVariants>["variant"];
  triggerIcon?: React.ReactNode;
  defaultBranchId?: string;
  expense?: {
    id: string;
    description: string;
    amount: number;
    branchId: string;
    category: string;
    date: Date;
    isRecurring: boolean;
  };
}) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isEdit = !!expense;

  const form = useForm<FormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: expense
      ? {
          description: expense.description,
          amount: String(expense.amount),
          branchId: expense.branchId,
          category: expense.category,
          date: toDateInputValue(expense.date),
          isRecurring: expense.isRecurring,
        }
      : {
          description: "",
          amount: "",
          branchId: defaultBranchId ?? "",
          category: "" as unknown as FormValues["category"],
          date: toDateInputValue(new Date()),
          isRecurring: false,
        },
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = isEdit ? await updateExpense(expense!.id, values) : await createExpense(values);

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
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg scrollbar-none" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between gap-2">
          <DialogTitle className="text-xl font-semibold text-sky-500">
            {isEdit ? "تعديل المصروف" : "مصروف جديد"}
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
                name="description"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="col-span-2">
                    <FieldLabel htmlFor="description">اتصرف على إيه؟</FieldLabel>
                    <Input
                      {...field}
                      id="description"
                      placeholder="مثال: فاتورة كهرباء فرع المعادي"
                      className="h-11!"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="amount"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="col-span-2">
                    <FieldLabel htmlFor="amount">المبلغ</FieldLabel>
                    <Input
                      {...field}
                      id="amount"
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
                name="category"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel>الفئة</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11! w-full" aria-invalid={fieldState.invalid}>
                        <SelectValue placeholder="اختر الفئة">
                          {(value: string) => CATEGORY_OPTIONS.find((c) => c.value === value)?.label ?? "اختر الفئة"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        {CATEGORY_OPTIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
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
                      onChange={field.onChange}
                      disabledAfter={new Date()}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="branchId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="col-span-2">
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

              <Controller
                name="isRecurring"
                control={form.control}
                render={({ field }) => (
                  <Field
                    orientation="horizontal"
                    className="col-span-2 flex-row-reverse justify-end gap-3 rounded-lg border border-border px-3 py-2.5"
                  >
                    <Switch checked={field.value} onCheckedChange={field.onChange} id="isRecurring" />
                    <FieldLabel htmlFor="isRecurring" className="font-normal">
                      مصروف متكرر شهريًا
                    </FieldLabel>
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
              {isEdit ? "حفظ التعديلات" : "إضافة المصروف"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
