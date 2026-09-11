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
import { createInventoryItem, updateInventoryItem } from "@/lib/actions/inventory";
import { cn } from "@/lib/utils";

const CATEGORY_OPTIONS = [
  { value: "MATERIALS", label: "مواد" },
  { value: "TOOLS", label: "أدوات" },
  { value: "DEVICES", label: "أجهزة" },
];

const itemFormSchema = z.object({
  name: z.string().min(2, "اسم الصنف مطلوب"),
  category: z.enum(["MATERIALS", "TOOLS", "DEVICES"], { message: "اختر الفئة" }),
  unit: z.string().min(1, "الوحدة مطلوبة"),
  branchId: z.string().min(1, "الفرع مطلوب"),
  quantity: z.string().min(1, "الكمية مطلوبة"),
  reorderPoint: z.string().min(1, "حد إعادة الطلب مطلوب"),
  purchasePrice: z.string().min(1, "سعر الشراء مطلوب"),
  supplier: z.string().optional(),
  supplierPhone: z.string().optional(),
});

type FormValues = z.infer<typeof itemFormSchema>;

export function InventoryItemFormDialog({
  branches,
  triggerLabel,
  triggerVariant = "default",
  triggerIcon,
  item,
}: {
  branches: { id: string; name: string }[];
  triggerLabel: string;
  triggerVariant?: VariantProps<typeof buttonVariants>["variant"];
  triggerIcon?: React.ReactNode;
  item?: {
    id: string;
    name: string;
    category: string;
    unit: string;
    branchId: string;
    quantity: number;
    reorderPoint: number;
    purchasePrice: number;
    supplier: string | null;
    supplierPhone: string | null;
  };
}) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isEdit = !!item;

  const form = useForm<FormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: item
      ? {
          name: item.name,
          category: item.category as FormValues["category"],
          unit: item.unit,
          branchId: item.branchId,
          quantity: String(item.quantity),
          reorderPoint: String(item.reorderPoint),
          purchasePrice: String(item.purchasePrice),
          supplier: item.supplier ?? "",
          supplierPhone: item.supplierPhone ?? "",
        }
      : {
          name: "",
          category: "" as unknown as FormValues["category"],
          unit: "",
          branchId: "",
          quantity: "0",
          reorderPoint: "0",
          purchasePrice: "",
          supplier: "",
          supplierPhone: "",
        },
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = isEdit ? await updateInventoryItem(item!.id, values) : await createInventoryItem(values);

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
            {isEdit ? "تعديل الصنف" : "إضافة صنف جديد"}
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
                    <FieldLabel htmlFor="name">اسم الصنف</FieldLabel>
                    <Input {...field} id="name" className="h-11!" aria-invalid={fieldState.invalid} />
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
                name="unit"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="unit">الوحدة</FieldLabel>
                    <Input
                      {...field}
                      id="unit"
                      placeholder="علبة، أنبوبة، قطعة..."
                      className="h-11!"
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
                name="quantity"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="quantity">الكمية الحالية</FieldLabel>
                    <Input
                      {...field}
                      id="quantity"
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
                name="reorderPoint"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="reorderPoint">حد إعادة الطلب</FieldLabel>
                    <Input
                      {...field}
                      id="reorderPoint"
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
                name="purchasePrice"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="col-span-2">
                    <FieldLabel htmlFor="purchasePrice">سعر الشراء</FieldLabel>
                    <Input
                      {...field}
                      id="purchasePrice"
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
                name="supplier"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="supplier">المورد (اختياري)</FieldLabel>
                    <Input {...field} id="supplier" className="h-11!" />
                  </Field>
                )}
              />

              <Controller
                name="supplierPhone"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="supplierPhone">هاتف المورد (اختياري)</FieldLabel>
                    <Input {...field} id="supplierPhone" dir="ltr" className="h-11!" />
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
              {isEdit ? "حفظ التعديلات" : "إضافة الصنف"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
