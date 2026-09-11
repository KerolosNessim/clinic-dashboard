"use client";

import { useState } from "react";
import { Smile } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { CONDITION_META, CONDITION_ORDER, toothLabel } from "@/lib/dental-chart";
import { cn } from "@/lib/utils";
import type { ToothCondition } from "@/generated/prisma/enums";
import type { ToothState } from "./use-dental-chart";

export function ToothDetailPanel({
  toothNumber,
  state,
  onSave,
  isPending,
  error,
}: {
  toothNumber: number | null;
  state: ToothState;
  onSave: (condition: ToothCondition, notes: string) => void;
  isPending: boolean;
  error: string | null;
}) {
  if (toothNumber === null) {
    return (
      <div className="rounded-xl border border-border bg-white p-4 sm:p-6">
        <Empty className="border-0 py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Smile />
            </EmptyMedia>
            <EmptyTitle>اختر سناً</EmptyTitle>
            <EmptyDescription>اضغط على أي سن في المخطط لعرض حالته وتعديلها</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <ToothDetailForm
      key={toothNumber}
      toothNumber={toothNumber}
      state={state}
      onSave={onSave}
      isPending={isPending}
      error={error}
    />
  );
}

function ToothDetailForm({
  toothNumber,
  state,
  onSave,
  isPending,
  error,
}: {
  toothNumber: number;
  state: ToothState;
  onSave: (condition: ToothCondition, notes: string) => void;
  isPending: boolean;
  error: string | null;
}) {
  const [condition, setCondition] = useState<ToothCondition>(state.condition);
  const [notes, setNotes] = useState(state.notes ?? "");
  const meta = CONDITION_META[condition];

  return (
    <div className="rounded-xl border border-border bg-white p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-foreground">السن رقم {toothNumber}</p>
          <p className="truncate text-xs text-muted-foreground">{toothLabel(toothNumber)}</p>
        </div>
        <Badge className={cn("shrink-0", meta.swatchBg, meta.swatchBorder, meta.swatchText)}>{meta.label}</Badge>
      </div>

      <div className="space-y-4 border-t border-border pt-4">
        <Field>
          <FieldLabel>الحالة</FieldLabel>
          <Select value={condition} onValueChange={(v) => setCondition(v as ToothCondition)}>
            <SelectTrigger className="h-11! w-full">
              <SelectValue>{(value: ToothCondition) => CONDITION_META[value].label}</SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {CONDITION_ORDER.map((c) => (
                <SelectItem key={c} value={c}>
                  {CONDITION_META[c].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="tooth-notes">ملاحظات</FieldLabel>
          <Textarea
            id="tooth-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="أي ملاحظات إضافية عن هذا السن..."
          />
        </Field>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button className="h-11! w-full" type="button" disabled={isPending} onClick={() => onSave(condition, notes)}>
          {isPending && <Spinner />}
          حفظ التغييرات
        </Button>
      </div>
    </div>
  );
}
