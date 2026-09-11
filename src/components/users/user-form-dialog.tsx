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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { createUser, updateUser } from "@/lib/actions/users";
import { ROLE_LABEL } from "@/lib/user-display";
import { Role } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const userFormSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  phone: z.string().regex(/^01[0125][0-9]{8}$/, "رقم هاتف مصري غير صحيح"),
  password: z.string().min(6, "6 أحرف على الأقل").optional().or(z.literal("")),
  role: z.enum(Role, { message: "اختر الدور" }),
  branchIds: z.array(z.string()),
});

type FormValues = z.infer<typeof userFormSchema>;

export function UserFormDialog({
  branches,
  triggerLabel,
  triggerVariant = "default",
  triggerIcon,
  user,
  fixedRole,
  entityLabel = "مستخدم",
}: {
  branches: { id: string; name: string }[];
  triggerLabel: string;
  triggerVariant?: VariantProps<typeof buttonVariants>["variant"];
  triggerIcon?: React.ReactNode;
  user?: {
    id: string;
    name: string;
    phone: string;
    role: Role;
    branches: { branch: { id: string; name: string } }[];
  };
  /** When set, the role is fixed and the role selector is hidden (used by /doctors and /assistants) */
  fixedRole?: Role;
  /** Arabic noun used in dialog titles/buttons, e.g. "طبيب" / "مساعد" */
  entityLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isEdit = !!user;

  const form = useForm<FormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: user
      ? {
          name: user.name,
          phone: user.phone,
          password: "",
          role: user.role,
          branchIds: user.branches.map((b) => b.branch.id),
        }
      : {
          name: "",
          phone: "",
          password: "",
          role: fixedRole ?? ("" as unknown as Role),
          branchIds: [],
        },
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = isEdit ? await updateUser(user!.id, values) : await createUser(values);

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
            {isEdit ? `تعديل ${entityLabel}` : `إضافة ${entityLabel} جديد`}
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
                    <FieldLabel htmlFor="name">الاسم</FieldLabel>
                    <Input {...field} id="name" className="h-11!" aria-invalid={fieldState.invalid} />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="phone"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className={cn(fixedRole && "col-span-2")}>
                    <FieldLabel htmlFor="phone">رقم الهاتف</FieldLabel>
                    <Input
                      {...field}
                      id="phone"
                      dir="ltr"
                      placeholder="01XXXXXXXXX"
                      inputMode="numeric"
                      className="h-11! "
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="role"
                control={form.control}
                render={({ field, fieldState }) =>
                  fixedRole ? (
                    <input type="hidden" {...field} />
                  ) : (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel>الدور</FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-11! w-full" aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder="اختر الدور" />
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                          {Object.values(Role).map((r) => (
                            <SelectItem key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )
                }
              />

              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="col-span-2">
                    <FieldLabel htmlFor="password">
                      كلمة المرور {isEdit && <span className="text-slate-400">(اتركها فارغة لعدم التغيير)</span>}
                    </FieldLabel>
                    <Input
                      {...field}
                      id="password"
                      type="password"
                      dir="ltr"
                      className="h-11!"
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="branchIds"
                control={form.control}
                render={({ field }) => (
                  <Field className="col-span-2">
                    <FieldLabel>الفروع</FieldLabel>
                    <div className="grid grid-cols-2 gap-2 rounded-lg border border-input p-3">
                      {branches.map((branch) => {
                        const checked = field.value.includes(branch.id);
                        return (
                          <label key={branch.id} className="flex items-center gap-2 text-sm text-slate-700">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(next) => {
                                field.onChange(
                                  next
                                    ? [...field.value, branch.id]
                                    : field.value.filter((id) => id !== branch.id)
                                );
                              }}
                            />
                            {branch.name}
                          </label>
                        );
                      })}
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
              {isEdit ? "حفظ التعديلات" : `إضافة ${entityLabel}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
