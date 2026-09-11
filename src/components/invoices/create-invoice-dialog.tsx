"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircleIcon, Plus, Receipt, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { createInvoice } from "@/lib/actions/invoices";
import { formatCurrency } from "@/lib/format";

type ItemDraft = { name: string; price: string; quantity: string };

export function CreateInvoiceDialog({
  patientId,
  branchId,
  visitId,
  planId,
  defaultItemName,
  defaultPrice,
  triggerLabel = "إصدار فاتورة",
}: {
  patientId: string;
  branchId: string;
  visitId?: string;
  planId?: string;
  defaultItemName: string;
  defaultPrice: number;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ItemDraft[]>([
    { name: defaultItemName, price: String(defaultPrice), quantity: "1" },
  ]);
  const [discount, setDiscount] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const subtotal = items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
  const total = Math.max(subtotal - (Number(discount) || 0), 0);

  function updateItem(index: number, patch: Partial<ItemDraft>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addItem() {
    setItems((prev) => [...prev, { name: "", price: "0", quantity: "1" }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function onSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await createInvoice({
        patientId,
        branchId,
        visitId: visitId ?? null,
        planId: planId ?? null,
        items,
        discount,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
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
          <Button variant="sky" type="button">
            <Receipt data-icon="inline-end" />
            {triggerLabel}
          </Button>
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl scrollbar-none" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between gap-2">
          <DialogTitle className="text-xl font-semibold text-sky-500">إصدار فاتورة</DialogTitle>
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
            <FieldLabel>بنود الفاتورة</FieldLabel>
            <div className="flex flex-col gap-2">
              {items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(index, { name: e.target.value })}
                    placeholder="اسم البند"
                    className="h-11! flex-1"
                  />
                  <Input
                    value={item.price}
                    onChange={(e) => updateItem(index, { price: e.target.value })}
                    type="number"
                    min="0"
                    step="0.01"
                    dir="ltr"
                    placeholder="السعر"
                    className="h-11! w-24"
                  />
                  <Input
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: e.target.value })}
                    type="number"
                    min="1"
                    dir="ltr"
                    placeholder="الكمية"
                    className="h-11! w-20"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="h-11! w-11!"
                    disabled={items.length === 1}
                    onClick={() => removeItem(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" className="h-9! self-start" onClick={addItem}>
              <Plus data-icon="inline-end" />
              إضافة بند
            </Button>
          </Field>

          <Field>
            <FieldLabel htmlFor="discount">الخصم</FieldLabel>
            <Input
              id="discount"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              type="number"
              min="0"
              step="0.01"
              dir="ltr"
              className="h-11!"
            />
          </Field>

          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
            <span className="text-sm text-muted-foreground">الإجمالي المستحق</span>
            <span className="text-lg font-bold text-foreground">{formatCurrency(total)}</span>
          </div>
        </FieldGroup>

        <DialogFooter className="mt-4">
          <Button className="h-11!" type="button" variant="outline" onClick={() => setOpen(false)}>
            إلغاء
          </Button>
          <Button className="h-11!" type="button" disabled={isPending} onClick={onSubmit}>
            {isPending && <Spinner />}
            إصدار الفاتورة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
