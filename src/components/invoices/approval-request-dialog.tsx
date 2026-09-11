"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, ShieldQuestion, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { submitApprovalRequest } from "@/lib/actions/invoices";
import { formatCurrency } from "@/lib/format";

const TYPE_OPTIONS = [
  { value: "EDIT_PAYMENT", label: "تعديل دفعة" },
  { value: "DELETE_PAYMENT", label: "حذف دفعة" },
  { value: "UNLOCK_INVOICE", label: "فتح الفاتورة للتعديل" },
];

type ApprovalType = "EDIT_PAYMENT" | "DELETE_PAYMENT" | "UNLOCK_INVOICE";

export function ApprovalRequestDialog({
  invoiceId,
  payments,
}: {
  invoiceId: string;
  payments: { id: string; amount: number; method: string; createdAt: Date }[];
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ApprovalType>("EDIT_PAYMENT");
  const [paymentId, setPaymentId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const needsPayment = type === "EDIT_PAYMENT" || type === "DELETE_PAYMENT";

  function onSubmit() {
    setError(null);
    if (needsPayment && !paymentId) {
      setError("اختر الدفعة أولاً");
      return;
    }
    startTransition(async () => {
      const result = await submitApprovalRequest({
        type,
        entityId: needsPayment ? paymentId : invoiceId,
        reason,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setReason("");
      setPaymentId("");
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger
        render={
          <Button variant="outline" type="button">
            <ShieldQuestion data-icon="inline-end" />
            طلب مراجعة
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between gap-2">
          <DialogTitle className="text-xl font-semibold text-sky-500">طلب مراجعة</DialogTitle>
          <DialogClose render={<Button variant="sky" className="h-8 w-8 rounded-lg p-0" type="button" />}>
            <X className="size-4" />
          </DialogClose>
        </DialogHeader>

        <FieldGroup>
          {error && (
            <Alert variant="destructive" className="bg-red-50 text-start text-red-700">
              <AlertCircleIcon className="size-4 text-red-700" />
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}

          <Field>
            <FieldLabel>نوع الطلب</FieldLabel>
            <Select
              value={type}
              onValueChange={(v) => {
                setType(v as ApprovalType);
                setPaymentId("");
              }}
            >
              <SelectTrigger className="h-11! w-full">
                <SelectValue placeholder="اختر النوع">
                  {(value: string) => TYPE_OPTIONS.find((t) => t.value === value)?.label ?? "اختر النوع"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {needsPayment && (
            <Field>
              <FieldLabel>الدفعة</FieldLabel>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">لا توجد دفعات مسجلة على هذه الفاتورة</p>
              ) : (
                <Select value={paymentId} onValueChange={(v) => setPaymentId(v ?? "")}>
                  <SelectTrigger className="h-11! w-full">
                    <SelectValue placeholder="اختر الدفعة">
                      {(value: string) => {
                        const p = payments.find((p) => p.id === value);
                        return p ? `${formatCurrency(p.amount)} — ${new Date(p.createdAt).toLocaleDateString("ar-EG")}` : "اختر الدفعة";
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {payments.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {formatCurrency(p.amount)} — {new Date(p.createdAt).toLocaleDateString("ar-EG")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Field>
          )}

          <Field>
            <FieldLabel htmlFor="reason">سبب الطلب</FieldLabel>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اشرح سبب طلب التعديل أو الحذف أو فتح الفاتورة"
            />
          </Field>
        </FieldGroup>

        <DialogFooter className="mt-4">
          <Button className="h-11!" type="button" variant="outline" onClick={() => setOpen(false)}>
            إلغاء
          </Button>
          <Button className="h-11!" type="button" disabled={isPending} onClick={onSubmit}>
            {isPending && <Spinner />}
            إرسال الطلب
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
