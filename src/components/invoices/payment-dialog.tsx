"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircleIcon, CircleDollarSign, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { recordPayment, updatePayment } from "@/lib/actions/invoices";
import { formatCurrency } from "@/lib/format";

const METHOD_OPTIONS = [
  { value: "CASH", label: "نقدي" },
  { value: "TRANSFER", label: "تحويل" },
];

const recordFormSchema = z.object({
  method: z.enum(["CASH", "TRANSFER"]),
  type: z.enum(["FULL", "INSTALLMENT"]),
  amount: z.string().optional(),
  reference: z.string().optional(),
});

const editFormSchema = z.object({
  method: z.enum(["CASH", "TRANSFER"]),
  amount: z.string().min(1, "المبلغ مطلوب"),
  reference: z.string().optional(),
});

type RecordFormValues = z.infer<typeof recordFormSchema>;
type EditFormValues = z.infer<typeof editFormSchema>;

function RecordPaymentForm({
  invoiceId,
  remainingAmount,
  onDone,
}: {
  invoiceId: string;
  remainingAmount: number;
  onDone: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [type, setType] = useState<RecordFormValues["type"]>("FULL");

  const form = useForm<RecordFormValues>({
    resolver: zodResolver(recordFormSchema),
    defaultValues: { method: "CASH", type: "FULL", amount: "", reference: "" },
  });

  function onSubmit(values: RecordFormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await recordPayment(invoiceId, values);
      if (result?.error) {
        setServerError(result.error);
        return;
      }
      form.reset();
      onDone();
      router.refresh();
    });
  }

  return (
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
            name="method"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>طريقة الدفع</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11! w-full" aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="اختر الطريقة">
                      {(value: string) => METHOD_OPTIONS.find((m) => m.value === value)?.label ?? "اختر الطريقة"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {METHOD_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="reference"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="reference">رقم مرجعي (اختياري)</FieldLabel>
                <Input {...field} id="reference" dir="ltr" className="h-11!" placeholder="رقم العملية" />
              </Field>
            )}
          />
        </div>

        <Field>
          <FieldLabel>نوع الدفعة</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={type === "FULL" ? "sky" : "outline"}
              className="h-11!"
              onClick={() => {
                setType("FULL");
                form.setValue("type", "FULL");
              }}
            >
              حساب كامل
            </Button>
            <Button
              type="button"
              variant={type === "INSTALLMENT" ? "sky" : "outline"}
              className="h-11!"
              onClick={() => {
                setType("INSTALLMENT");
                form.setValue("type", "INSTALLMENT");
              }}
            >
              قسط
            </Button>
          </div>
        </Field>

        {type === "FULL" ? (
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
            <span className="text-sm text-muted-foreground">المبلغ المستحق بالكامل</span>
            <span className="text-lg font-bold text-foreground">{formatCurrency(remainingAmount)}</span>
          </div>
        ) : (
          <Controller
            name="amount"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="amount">قيمة القسط</FieldLabel>
                <Input
                  {...field}
                  id="amount"
                  type="number"
                  min="0"
                  max={remainingAmount}
                  step="0.01"
                  dir="ltr"
                  className="h-11!"
                  aria-invalid={fieldState.invalid}
                />
                <p className="text-xs text-muted-foreground">المتبقي على الفاتورة: {formatCurrency(remainingAmount)}</p>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        )}
      </FieldGroup>

      <DialogFooter className="mt-4">
        <Button className="h-11!" type="button" variant="outline" onClick={onDone}>
          إلغاء
        </Button>
        <Button className="h-11!" type="submit" disabled={isPending}>
          {isPending && <Spinner />}
          حفظ
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditPaymentForm({
  payment,
  onDone,
}: {
  payment: { id: string; method: string; amount: number; reference: string | null };
  onDone: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      method: (payment.method as EditFormValues["method"]) ?? "CASH",
      amount: String(payment.amount),
      reference: payment.reference ?? "",
    },
  });

  function onSubmit(values: EditFormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await updatePayment(payment.id, values);
      if (result?.error) {
        setServerError(result.error);
        return;
      }
      form.reset();
      onDone();
      router.refresh();
    });
  }

  return (
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
            name="method"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>طريقة الدفع</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-11! w-full" aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder="اختر الطريقة">
                      {(value: string) => METHOD_OPTIONS.find((m) => m.value === value)?.label ?? "اختر الطريقة"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {METHOD_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="amount"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
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
            name="reference"
            control={form.control}
            render={({ field }) => (
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="reference">رقم مرجعي (اختياري)</FieldLabel>
                <Input {...field} id="reference" dir="ltr" className="h-11!" placeholder="رقم العملية" />
              </Field>
            )}
          />
        </div>
      </FieldGroup>

      <DialogFooter className="mt-4">
        <Button className="h-11!" type="button" variant="outline" onClick={onDone}>
          إلغاء
        </Button>
        <Button className="h-11!" type="submit" disabled={isPending}>
          {isPending && <Spinner />}
          حفظ
        </Button>
      </DialogFooter>
    </form>
  );
}

export function PaymentDialog({
  invoiceId,
  remainingAmount,
  payment,
}: {
  invoiceId: string;
  /** Required to record a new payment — the FULL option shows this locked as the amount */
  remainingAmount?: number;
  /** Pass an existing payment to switch the dialog to edit mode (only usable once the invoice is unlocked) */
  payment?: { id: string; method: string; amount: number; reference: string | null };
}) {
  const isEdit = !!payment;
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant={isEdit ? "amber" : "emerald"} type="button">
            {isEdit ? <Pencil data-icon="inline-end" /> : <CircleDollarSign data-icon="inline-end" />}
            {isEdit ? "تعديل الدفعة" : "تسجيل دفعة"}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between gap-2">
          <DialogTitle className="text-xl font-semibold text-sky-500">
            {isEdit ? "تعديل الدفعة" : "تسجيل دفعة"}
          </DialogTitle>
          <DialogClose render={<Button variant="sky" className="h-8 w-8 rounded-lg p-0" type="button" />}>
            <X className="size-4" />
          </DialogClose>
        </DialogHeader>

        {isEdit ? (
          <EditPaymentForm payment={payment} onDone={() => setOpen(false)} />
        ) : (
          <RecordPaymentForm
            invoiceId={invoiceId}
            remainingAmount={remainingAmount ?? 0}
            onDone={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
