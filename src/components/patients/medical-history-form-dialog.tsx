"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircleIcon, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { upsertMedicalHistory } from "@/lib/actions/medical-history";

const PREGNANCY_OPTIONS: Record<string, boolean> = {
  yes: true,
  no: false,
};

const PREGNANCY_LABEL: Record<string, string> = {
  yes: "نعم",
  no: "لا",
};

const formSchema = z.object({
  allergies: z.string(),
  chronicDiseases: z.string(),
  isPregnant: z.enum(["yes", "no"]),
  currentMedications: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

function toList(value: string) {
  return value
    .split(/[,،]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

export function MedicalHistoryFormDialog({
  patientId,
  gender,
  medicalHistory,
}: {
  patientId: string;
  gender: string;
  medicalHistory?: {
    allergies: string[];
    chronicDiseases: string[];
    isPregnant: boolean | null;
    currentMedications: string | null;
  } | null;
}) {
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isFemale = gender === "أنثى";

  const pregnancyKey = medicalHistory?.isPregnant === true ? "yes" : "no";

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      allergies: medicalHistory?.allergies.join("، ") ?? "",
      chronicDiseases: medicalHistory?.chronicDiseases.join("، ") ?? "",
      isPregnant: pregnancyKey,
      currentMedications: medicalHistory?.currentMedications ?? "",
    },
  });

  function onSubmit(values: FormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await upsertMedicalHistory(patientId, {
        allergies: toList(values.allergies),
        chronicDiseases: toList(values.chronicDiseases),
        isPregnant: isFemale ? PREGNANCY_OPTIONS[values.isPregnant] : null,
        currentMedications: values.currentMedications || undefined,
      });

      if (result?.error) {
        setServerError(result.error);
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
        if (!next) setServerError(null);
      }}
    >
      <DialogTrigger
        render={
          <Button size="lg" variant="amber" type="button">
            تعديل
            <Pencil data-icon="inline-end" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="flex-row! items-center justify-between">
          <DialogTitle className={"text-lg font-semibold"}>
            تعديل التاريخ الطبي
          </DialogTitle>
          <DialogClose
            render={
              <Button
                variant="sky"
                className="h-8 w-8 rounded-lg p-0"
                type="button"
              />
            }
          >
            <X className="size-4" />
          </DialogClose>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            {serverError && (
              <Alert
                variant="destructive"
                className="bg-red-50 text-start text-red-700"
              >
                <AlertCircleIcon className="size-4 text-red-700" />
                <AlertTitle>{serverError}</AlertTitle>
              </Alert>
            )}

            <Controller
              name="allergies"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="allergies">الحساسية</FieldLabel>
                  <Input
                    {...field}
                    id="allergies"
                    className="h-11"
                    placeholder="بنسلين، مأكولات بحرية"
                  />
                  <FieldDescription className="text-start">
                    افصل بين كل حساسية والتانية بفاصلة
                  </FieldDescription>
                </Field>
              )}
            />

            <Controller
              name="chronicDiseases"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="chronicDiseases">أمراض مزمنة</FieldLabel>
                  <Input
                    {...field}
                    id="chronicDiseases"
                    className="h-11"
                    placeholder="سكر، ضغط"
                  />
                  <FieldDescription className="text-start">
                    افصل بين كل مرض والتاني بفاصلة
                  </FieldDescription>
                </Field>
              )}
            />

            {isFemale && (
              <Controller
                name="isPregnant"
                control={form.control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel>حامل؟</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-11! w-full">
                        <SelectValue>
                          {(value: string) => PREGNANCY_LABEL[value] ?? "اختر"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectItem value="yes">نعم</SelectItem>
                        <SelectItem value="no">لا</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            )}

            <Controller
              name="currentMedications"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="currentMedications">
                    أدوية حالية
                  </FieldLabel>
                  <Textarea {...field} id="currentMedications" rows={3} />
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Spinner />}
              حفظ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
